import { Types } from "mongoose";

import {
  ACTIVITY_STATUS,
  CREATOR_EARNING_STATUS,
  DISPUTE_STATUS,
  PAGINATION,
  PARTICIPANT_STATUS,
  PAYMENT_ARCHITECTURE,
  PAYMENT_STATUS,
  REFUND_STATUS,
  TRANSFER_STATUS,
} from "@/constants/app.constants";
import { notificationService } from "@/modules/notification/notification.service";
import { stripeService } from "@/services/stripe.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";

import { EventParticipant } from "../event/event-participant.model";
import { Event } from "../event/event.model";
import { PaymentTransaction } from "../event/payment-transaction.model";
import { User } from "../user/user.model";
import {
  amountMajorToMinor,
  amountMinorToMajor,
  calculateEventRevenueSplit,
} from "./event-revenue.util";
import { PayoutRequest } from "./payout-request.model";

const PAYMENT_STATUS_SUCCEEDED = "succeeded";
const PAYMENT_STATUS_PENDING = "pending";
const PAYMENT_STATUS_FAILED = "failed";
const PAYMENT_STATUS_REFUNDED = "refunded";

export class BillingService {
  private readonly successfulPaymentStatuses = [
    PAYMENT_STATUS.SUCCEEDED,
    "succeeded",
  ];

  async listMyTransactions(
    userId: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    return this.listTransactionsCommon({ ...query, payerId: userId });
  }

  async listAdminTransactions(
    query: { page?: number; limit?: number; status?: string },
  ) {
    return this.listTransactionsCommon(query);
  }

  async creatorEarningsSummary(creatorId: string) {
    const [summary] = await PaymentTransaction.aggregate([
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $match: {
          "event.creatorId": new Types.ObjectId(creatorId),
          "$or": [
            { paymentStatus: PAYMENT_STATUS_SUCCEEDED },
            { status: { $in: this.successfulPaymentStatuses } },
          ],
          "refundStatus": { $ne: REFUND_STATUS.SUCCEEDED },
        },
      },
      {
        $group: {
          _id: null,
          totalGross: { $sum: "$grossAmount" },
          totalPlatformFee: { $sum: "$platformFeeAmount" },
          totalCreatorShare: { $sum: "$creatorShareAmount" },
          pendingCreatorShare: {
            $sum: {
              $cond: [
                { $eq: ["$creatorEarningStatus", CREATOR_EARNING_STATUS.PENDING] },
                "$creatorShareAmount",
                0,
              ],
            },
          },
          transferredCreatorShare: {
            $sum: {
              $cond: [
                { $eq: ["$creatorEarningStatus", CREATOR_EARNING_STATUS.TRANSFERRED] },
                "$creatorShareAmount",
                0,
              ],
            },
          },
          transactionsCount: { $sum: 1 },
        },
      },
    ]);

    const [payoutSummary] = await PayoutRequest.aggregate([
      {
        $match: {
          creatorId: new Types.ObjectId(creatorId),
          status: { $in: ["approved", "paid"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRequested: { $sum: "$amount" },
        },
      },
    ]);

    const totalCreatorShare = summary?.totalCreatorShare || 0;
    const pendingCreatorShare = summary?.pendingCreatorShare || 0;
    const transferredCreatorShare = summary?.transferredCreatorShare || 0;
    const totalPaidOut = payoutSummary?.totalRequested || 0;
    const ledgerAvailableBalance = Math.max(
      0,
      Number((transferredCreatorShare - totalPaidOut).toFixed(2)),
    );
    const stripeBalance = await this.getStripeConnectedBalanceSnapshot(creatorId);
    const availableBalance
      = stripeBalance?.availableBalance ?? ledgerAvailableBalance;

    return {
      totalGross: summary?.totalGross || 0,
      totalPlatformFee: summary?.totalPlatformFee || 0,
      totalCreatorShare,
      pendingCreatorShare,
      transferredCreatorShare,
      transactionsCount: summary?.transactionsCount || 0,
      totalPaidOut,
      availableBalance,
      ledgerAvailableBalance,
      currency: "USD",
      stripe: stripeBalance,
    };
  }

  async createPayoutRequest(
    creatorId: string,
    payload: { amount: number; currency?: string; note?: string },
  ) {
    const summary = await this.creatorEarningsSummary(creatorId);
    if (payload.amount > summary.availableBalance) {
      throw new BadRequestException("Requested amount exceeds available balance");
    }

    return PayoutRequest.create({
      creatorId,
      amount: payload.amount,
      currency: payload.currency || "USD",
      note: payload.note,
      status: "requested",
      payoutMethod: "admin_request",
    });
  }

  async createSelfWithdrawal(
    creatorId: string,
    payload: { amount?: number; currency?: string; note?: string },
  ) {
    const host = await User.findById(creatorId)
      .select("stripeAccountId stripeOnboardingCompleted email")
      .exec();
    if (!host) {
      throw new NotFoundException("Host not found");
    }
    if (!host.stripeAccountId || !host.stripeOnboardingCompleted) {
      throw new BadRequestException(
        "Stripe onboarding is incomplete. Complete Stripe Connect onboarding before withdrawing.",
      );
    }

    const account = await stripeService.retrieveConnectedAccount(host.stripeAccountId)
      .catch((error: any) => {
        throw new BadRequestException(
          error?.message || "Unable to verify host Stripe account",
        );
      });

    if (!account.charges_enabled || !account.payouts_enabled) {
      throw new BadRequestException(
        "Stripe payouts are not enabled for this host account yet.",
      );
    }

    const balance = await stripeService.retrieveConnectedAccountBalance(host.stripeAccountId)
      .catch((error: any) => {
        throw new BadRequestException(
          error?.message || "Unable to load Stripe balance for this host account",
        );
      });

    const normalizedCurrency = (payload.currency || "usd").toLowerCase();
    const availableBalanceCents = this.getStripeBalanceAmount(
      balance.available,
      normalizedCurrency,
    );
    const pendingBalanceCents = this.getStripeBalanceAmount(
      balance.pending,
      normalizedCurrency,
    );

    if (availableBalanceCents <= 0) {
      throw new BadRequestException(
        "No withdrawable Stripe balance is available right now.",
      );
    }

    const requestedAmountCents = payload.amount
      ? Math.round(payload.amount * 100)
      : availableBalanceCents;

    if (requestedAmountCents <= 0) {
      throw new BadRequestException("Withdrawal amount must be greater than zero");
    }

    if (requestedAmountCents > availableBalanceCents) {
      throw new BadRequestException(
        "Withdrawal amount exceeds the Stripe withdrawable balance.",
      );
    }

    const payout = await stripeService.createConnectedAccountPayout(
      host.stripeAccountId,
      {
        amount: requestedAmountCents,
        currency: normalizedCurrency,
        metadata: {
          creatorId,
          payoutMethod: "self_withdrawal",
        },
      },
    ).catch((error: any) => {
      throw new BadRequestException(
        error?.message || "Stripe payout failed",
      );
    });

    const amount = Number((requestedAmountCents / 100).toFixed(2));
    const payoutRecord = await PayoutRequest.create({
      creatorId,
      amount,
      currency: normalizedCurrency.toUpperCase(),
      status: "paid",
      payoutMethod: "self_withdrawal",
      provider: "stripe",
      providerPayoutId: payout.id,
      note: payload.note || "Host self withdrawal",
      reviewedAt: new Date(),
    });

    await notificationService.create({
      userId: creatorId,
      type: "payout_completed",
      title: "Withdrawal completed",
      body: `A payout of ${amount.toFixed(2)} ${normalizedCurrency.toUpperCase()} was sent to your Stripe account.`,
      payload: {
        payoutId: payoutRecord._id.toString(),
        stripePayoutId: payout.id,
        amount,
        currency: normalizedCurrency.toUpperCase(),
      },
    });

    return {
      payoutId: payoutRecord._id.toString(),
      stripePayoutId: payout.id,
      amount,
      currency: normalizedCurrency.toUpperCase(),
      status: payout.status,
      payoutMethod: "self_withdrawal",
      stripeAccountId: host.stripeAccountId,
      availableBalanceBefore: Number((availableBalanceCents / 100).toFixed(2)),
      availableBalanceAfter: Number(
        ((availableBalanceCents - requestedAmountCents) / 100).toFixed(2),
      ),
      pendingBalance: Number((pendingBalanceCents / 100).toFixed(2)),
      createdAt: payout.created
        ? new Date(payout.created * 1000)
        : payoutRecord.createdAt,
    };
  }

  async listMyPayouts(
    creatorId: string,
    query: { page?: number; limit?: number },
  ) {
    return this.listPayoutsCommon({ ...query, creatorId });
  }

  async listAdminPayouts(query: { page?: number; limit?: number }) {
    return this.listPayoutsCommon(query);
  }

  async updatePayoutStatus(
    payoutId: string,
    adminId: string,
    payload: { status: "approved" | "rejected" | "paid"; note?: string },
  ) {
    const payout = await PayoutRequest.findById(payoutId).exec();
    if (!payout)
      throw new NotFoundException("Payout request not found");

    payout.status = payload.status;
    payout.note = payload.note;
    payout.reviewedBy = adminId as any;
    payout.reviewedAt = new Date();
    await payout.save();

    await notificationService.create({
      userId: payout.creatorId.toString(),
      type: "payout_status_updated",
      title: "Payout status updated",
      body: `Payout request is now ${payload.status}.`,
      payload: { payoutId: payout._id.toString(), status: payload.status },
    });

    return payout;
  }

  async markTransactionSucceededByProviderRef(
    providerReference: string,
    provider: string = "stripe",
  ) {
    const transaction = await PaymentTransaction.findOneAndUpdate(
      {
        $or: [
          { providerReference, provider },
          { stripePaymentIntentId: providerReference, provider },
        ],
      },
      {
        status: PAYMENT_STATUS.SUCCEEDED,
        paymentStatus: PAYMENT_STATUS_SUCCEEDED,
        creatorEarningStatus: CREATOR_EARNING_STATUS.PENDING,
        transferStatus: TRANSFER_STATUS.NOT_CREATED,
      },
      { new: true },
    ).exec();

    if (transaction) {
      await this.confirmTicketForSucceededTransaction(transaction._id.toString());
    }

    return transaction;
  }

  async markTransactionFailedByProviderRef(
    providerReference: string,
    failureReason?: string,
    provider: string = "stripe",
  ) {
    return PaymentTransaction.findOneAndUpdate(
      {
        $or: [
          { providerReference, provider },
          { stripePaymentIntentId: providerReference, provider },
        ],
      },
      {
        status: PAYMENT_STATUS.FAILED,
        paymentStatus: PAYMENT_STATUS_FAILED,
        activePurchase: false,
        paymentFailedReason: failureReason,
      },
      { new: true },
    ).exec();
  }

  async createOrGetPendingTransactionForEvent(params: {
    eventId: string;
    payerId: string;
  }) {
    const { event, payableTicketPrice }
      = await this.validateEventTicketPurchaseEligibility(params.eventId, params.payerId);

    const grossAmountMinor = amountMajorToMinor(payableTicketPrice);
    if (grossAmountMinor <= 0) {
      throw new BadRequestException("This event is free. No payment is required.");
    }

    const split = calculateEventRevenueSplit(grossAmountMinor);
    const purchaseLockKey = this.getPurchaseLockKey(
      event._id.toString(),
      params.payerId,
    );
    const transferGroup = `event_${event._id.toString()}_payer_${params.payerId}`;
    const basePayload = {
      eventId: event._id,
      payerId: params.payerId,
      creatorId: event.creatorId,
      grossAmount: amountMinorToMajor(split.grossAmountMinor),
      grossAmountMinor: split.grossAmountMinor,
      currency: event.currency || "USD",
      platformFeeAmount: amountMinorToMajor(split.platformFeeAmountMinor),
      platformFeeAmountMinor: split.platformFeeAmountMinor,
      creatorShareAmount: amountMinorToMajor(split.creatorShareAmountMinor),
      creatorShareAmountMinor: split.creatorShareAmountMinor,
      refundedAmountMinor: 0,
      platformFeePercent: split.platformFeePercent,
      status: PAYMENT_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS_PENDING,
      creatorEarningStatus: CREATOR_EARNING_STATUS.PENDING,
      refundStatus: REFUND_STATUS.NONE,
      transferStatus: TRANSFER_STATUS.NOT_CREATED,
      disputeStatus: DISPUTE_STATUS.NONE,
      provider: "stripe",
      paymentArchitecture: PAYMENT_ARCHITECTURE.PLATFORM_CHARGE_DELAYED_TRANSFER,
      transferGroup,
      purchaseLockKey,
      activePurchase: true,
    };

    try {
      return await PaymentTransaction.findOneAndUpdate(
        {
          purchaseLockKey,
          paymentStatus: PAYMENT_STATUS_PENDING,
          activePurchase: true,
        },
        { $setOnInsert: basePayload },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).exec();
    }
    catch (error: any) {
      if (error?.code === 11000) {
        const existing = await PaymentTransaction.findOne({
          purchaseLockKey,
          activePurchase: true,
        }).sort({ createdAt: -1 }).exec();
        if (existing)
          return existing;
      }
      throw error;
    }
  }

  async createEventPaymentIntentForTransaction(transactionId: string) {
    const transaction = await PaymentTransaction.findById(transactionId).exec();
    if (!transaction)
      throw new NotFoundException("Payment transaction not found");
    if (transaction.paymentStatus !== PAYMENT_STATUS_PENDING) {
      throw new BadRequestException("This event ticket is already paid or unavailable.");
    }

    const amount = transaction.grossAmountMinor
      ?? amountMajorToMinor(transaction.grossAmount);
    if (amount <= 0) {
      throw new BadRequestException("Invalid event ticket amount.");
    }

    const intent = await stripeService.createEventPaymentIntent(
      {
        amount,
        currency: (transaction.currency || "usd").toLowerCase(),
        transfer_group: transaction.transferGroup,
        metadata: {
          paymentType: "event_ticket",
          transactionId: transaction._id.toString(),
          eventId: transaction.eventId.toString(),
          payerId: transaction.payerId.toString(),
          creatorId: transaction.creatorId?.toString?.() || "",
          paymentArchitecture: PAYMENT_ARCHITECTURE.PLATFORM_CHARGE_DELAYED_TRANSFER,
        },
        payment_method_types: ["card"],
      },
      `event-ticket-${transaction._id.toString()}`,
    );

    transaction.provider = "stripe";
    transaction.providerReference = intent.id;
    transaction.stripePaymentIntentId = intent.id;
    await transaction.save();

    return intent;
  }

  async handleEventTicketPaymentSucceeded(
    paymentIntentId: string,
    stripeChargeId?: string | null,
  ) {
    const transaction = await PaymentTransaction.findOneAndUpdate(
      {
        $or: [
          { stripePaymentIntentId: paymentIntentId },
          { providerReference: paymentIntentId },
        ],
      },
      {
        status: PAYMENT_STATUS.SUCCEEDED,
        paymentStatus: PAYMENT_STATUS_SUCCEEDED,
        stripeChargeId: stripeChargeId || undefined,
        creatorEarningStatus: CREATOR_EARNING_STATUS.PENDING,
        transferStatus: TRANSFER_STATUS.NOT_CREATED,
      },
      { new: true },
    ).exec();

    if (!transaction)
      return null;

    const event = await Event.findById(transaction.eventId).exec();
    if (event?.status === ACTIVITY_STATUS.CANCELLED) {
      await this.refundTransactionForEventCancellation(transaction._id.toString());
      return transaction;
    }

    await this.confirmTicketForSucceededTransaction(transaction._id.toString());
    return transaction;
  }

  async confirmTicketForSucceededTransaction(transactionId: string) {
    const transaction = await PaymentTransaction.findById(transactionId).exec();
    if (!transaction)
      throw new NotFoundException("Payment transaction not found");
    if (transaction.paymentStatus !== PAYMENT_STATUS_SUCCEEDED) {
      throw new BadRequestException("Payment has not succeeded.");
    }
    if (transaction.refundStatus === REFUND_STATUS.SUCCEEDED) {
      throw new BadRequestException("Refunded payments cannot create tickets.");
    }

    const event = await Event.findById(transaction.eventId).exec();
    if (!event)
      throw new NotFoundException("Event not found");
    if (event.status === ACTIVITY_STATUS.CANCELLED) {
      return null;
    }

    const participant = await EventParticipant.findOneAndUpdate(
      {
        eventId: transaction.eventId,
        userId: transaction.payerId,
      },
      {
        status: PARTICIPANT_STATUS.JOINED,
        joinedAt: new Date(),
        paymentTransactionId: transaction._id,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    await this.refreshEventJoinedCount(transaction.eventId.toString());
    return participant;
  }

  async processEventCancellationRefunds(eventId: string) {
    const transactions = await PaymentTransaction.find({
      eventId,
      paymentStatus: PAYMENT_STATUS_SUCCEEDED,
      refundStatus: { $ne: REFUND_STATUS.SUCCEEDED },
    }).exec();

    const results = [];
    for (const transaction of transactions) {
      try {
        const refunded = await this.refundTransactionForEventCancellation(
          transaction._id.toString(),
        );
        results.push({ transactionId: transaction._id.toString(), status: refunded?.refundStatus });
      }
      catch (error: any) {
        await PaymentTransaction.findByIdAndUpdate(transaction._id, {
          refundStatus: REFUND_STATUS.FAILED,
          lastRefundError: error?.message || "Refund failed",
          creatorEarningStatus: CREATOR_EARNING_STATUS.CANCELLED,
        }).exec();
        results.push({
          transactionId: transaction._id.toString(),
          status: REFUND_STATUS.FAILED,
          error: error?.message || "Refund failed",
        });
      }
    }

    return results;
  }

  async refundTransactionForEventCancellation(transactionId: string) {
    const transaction = await PaymentTransaction.findById(transactionId).exec();
    if (!transaction)
      throw new NotFoundException("Payment transaction not found");

    if (transaction.refundStatus === REFUND_STATUS.SUCCEEDED) {
      return transaction;
    }

    if (
      transaction.transferStatus === TRANSFER_STATUS.SUCCEEDED
      || transaction.stripeTransferId
    ) {
      transaction.refundStatus = REFUND_STATUS.FAILED;
      transaction.lastRefundError
        = "Creator transfer already exists. Manual review or transfer reversal is required before refund.";
      await transaction.save();
      return transaction;
    }

    const grossAmountMinor
      = transaction.grossAmountMinor ?? amountMajorToMinor(transaction.grossAmount);
    const refundedAmountMinor = transaction.refundedAmountMinor || 0;
    const remainingRefundAmountMinor = Math.max(0, grossAmountMinor - refundedAmountMinor);

    if (remainingRefundAmountMinor <= 0) {
      transaction.refundStatus = REFUND_STATUS.SUCCEEDED;
      transaction.paymentStatus = PAYMENT_STATUS_REFUNDED;
      transaction.status = PAYMENT_STATUS.REFUNDED;
      transaction.creatorEarningStatus = CREATOR_EARNING_STATUS.CANCELLED;
      transaction.activePurchase = false;
      await transaction.save();
      return transaction;
    }

    transaction.refundStatus = REFUND_STATUS.PENDING;
    transaction.creatorEarningStatus = CREATOR_EARNING_STATUS.CANCELLED;
    transaction.lastRefundError = undefined;
    await transaction.save();

    const paymentIntentId = transaction.stripePaymentIntentId || transaction.providerReference;
    if (!paymentIntentId) {
      throw new BadRequestException("Original Stripe payment intent is missing.");
    }

    const refund = await stripeService.createEventCancellationRefund(
      {
        payment_intent: paymentIntentId,
        amount: remainingRefundAmountMinor,
        reason: "requested_by_customer",
        metadata: {
          paymentType: "event_ticket",
          refundReason: "event_cancelled",
          transactionId: transaction._id.toString(),
          eventId: transaction.eventId.toString(),
          payerId: transaction.payerId.toString(),
        },
      },
      `event-cancel-refund-${transaction._id.toString()}`,
    );

    transaction.stripeRefundId = refund.id;
    transaction.refundStatus
      = refund.status === "failed" || refund.status === "canceled"
        ? REFUND_STATUS.FAILED
        : refund.status === "succeeded"
          ? REFUND_STATUS.SUCCEEDED
          : REFUND_STATUS.PENDING;
    transaction.activePurchase = false;
    if (transaction.refundStatus === REFUND_STATUS.SUCCEEDED) {
      transaction.refundedAmountMinor = grossAmountMinor;
      transaction.paymentStatus = PAYMENT_STATUS_REFUNDED;
      transaction.status = PAYMENT_STATUS.REFUNDED;
      transaction.refundedAt = new Date();
    }
    else if (transaction.refundStatus === REFUND_STATUS.FAILED) {
      transaction.refundedAmountMinor = refundedAmountMinor;
      transaction.paymentStatus = PAYMENT_STATUS_SUCCEEDED;
      transaction.status = PAYMENT_STATUS.SUCCEEDED;
      transaction.lastRefundError = `Stripe refund status: ${refund.status}`;
    }
    await transaction.save();
    return transaction;
  }

  async handleRefundUpdated(refundId: string, status?: string | null) {
    const transaction = await PaymentTransaction.findOne({
      stripeRefundId: refundId,
    }).exec();
    if (!transaction)
      return null;

    if (status === "failed" || status === "canceled") {
      transaction.refundStatus = REFUND_STATUS.FAILED;
      transaction.paymentStatus = PAYMENT_STATUS_SUCCEEDED;
      transaction.status = PAYMENT_STATUS.SUCCEEDED;
      transaction.refundedAmountMinor = 0;
      transaction.lastRefundError = `Stripe refund status: ${status}`;
    }
    else if (status === "succeeded") {
      transaction.refundStatus = REFUND_STATUS.SUCCEEDED;
      transaction.paymentStatus = PAYMENT_STATUS_REFUNDED;
      transaction.status = PAYMENT_STATUS.REFUNDED;
      transaction.refundedAmountMinor
        = transaction.grossAmountMinor ?? amountMajorToMinor(transaction.grossAmount);
      transaction.creatorEarningStatus = CREATOR_EARNING_STATUS.CANCELLED;
      transaction.activePurchase = false;
      transaction.refundedAt = new Date();
    }

    await transaction.save();
    return transaction;
  }

  async settleCompletedEvent(eventId: string) {
    const event = await Event.findById(eventId).exec();
    if (!event)
      throw new NotFoundException("Event not found");
    if (event.status !== ACTIVITY_STATUS.COMPLETED) {
      throw new BadRequestException("Event is not completed.");
    }

    const transactions = await PaymentTransaction.find({
      eventId: event._id,
      paymentStatus: PAYMENT_STATUS_SUCCEEDED,
      creatorEarningStatus: { $in: [CREATOR_EARNING_STATUS.PENDING, CREATOR_EARNING_STATUS.AVAILABLE] },
      refundStatus: { $ne: REFUND_STATUS.SUCCEEDED },
      transferStatus: { $in: [TRANSFER_STATUS.NOT_CREATED, TRANSFER_STATUS.FAILED] },
      disputeStatus: { $ne: DISPUTE_STATUS.OPEN },
    }).exec();

    const results = [];
    for (const transaction of transactions) {
      const settled = await this.settlePaymentTransaction(transaction._id.toString());
      results.push(settled);
    }

    return results;
  }

  async settlePaymentTransaction(transactionId: string) {
    const transaction = await PaymentTransaction.findById(transactionId).exec();
    if (!transaction)
      throw new NotFoundException("Payment transaction not found");

    if (transaction.transferStatus === TRANSFER_STATUS.SUCCEEDED) {
      return {
        transactionId,
        status: TRANSFER_STATUS.SUCCEEDED,
        stripeTransferId: transaction.stripeTransferId,
      };
    }

    const event = await Event.findById(transaction.eventId).exec();
    if (!event)
      throw new NotFoundException("Event not found");
    if (event.status !== ACTIVITY_STATUS.COMPLETED) {
      throw new BadRequestException("Event is not completed.");
    }
    if (transaction.paymentStatus !== PAYMENT_STATUS_SUCCEEDED) {
      throw new BadRequestException("Only succeeded payments can be settled.");
    }
    if (transaction.refundStatus === REFUND_STATUS.SUCCEEDED) {
      throw new BadRequestException("Refunded payments cannot be settled.");
    }
    if (transaction.disputeStatus === DISPUTE_STATUS.OPEN) {
      throw new BadRequestException("Disputed payments cannot be settled.");
    }

    const creator = await User.findById(transaction.creatorId || event.creatorId)
      .select("stripeAccountId stripeOnboardingCompleted")
      .exec();
    if (!creator?.stripeAccountId || !creator.stripeOnboardingCompleted) {
      transaction.creatorEarningStatus = CREATOR_EARNING_STATUS.AVAILABLE;
      transaction.transferStatus = TRANSFER_STATUS.FAILED;
      transaction.lastTransferError = "Creator Stripe onboarding is incomplete.";
      await transaction.save();
      return {
        transactionId,
        status: TRANSFER_STATUS.FAILED,
        error: transaction.lastTransferError,
      };
    }

    const account = await stripeService.retrieveConnectedAccount(creator.stripeAccountId);
    if (!account.charges_enabled) {
      transaction.creatorEarningStatus = CREATOR_EARNING_STATUS.AVAILABLE;
      transaction.transferStatus = TRANSFER_STATUS.FAILED;
      transaction.lastTransferError = "Creator Stripe account cannot receive charges/transfers yet.";
      await transaction.save();
      return {
        transactionId,
        status: TRANSFER_STATUS.FAILED,
        error: transaction.lastTransferError,
      };
    }

    const amount = transaction.creatorShareAmountMinor
      ?? amountMajorToMinor(transaction.creatorShareAmount);
    transaction.creatorEarningStatus = CREATOR_EARNING_STATUS.AVAILABLE;
    transaction.transferStatus = TRANSFER_STATUS.PENDING;
    transaction.lastTransferError = undefined;
    await transaction.save();

    try {
      const transfer = await stripeService.createCreatorTransfer(
        {
          amount,
          currency: (transaction.currency || "usd").toLowerCase(),
          destination: creator.stripeAccountId,
          transfer_group: transaction.transferGroup,
          ...(transaction.stripeChargeId ? { source_transaction: transaction.stripeChargeId } : {}),
          metadata: {
            paymentType: "event_ticket",
            transactionId: transaction._id.toString(),
            eventId: transaction.eventId.toString(),
            creatorId: creator._id.toString(),
          },
        },
        `event-earning-transfer-${transaction._id.toString()}`,
      );

      transaction.stripeTransferId = transfer.id;
      transaction.transferStatus = TRANSFER_STATUS.SUCCEEDED;
      transaction.creatorEarningStatus = CREATOR_EARNING_STATUS.TRANSFERRED;
      transaction.transferredAt = new Date();
      await transaction.save();

      return {
        transactionId,
        status: TRANSFER_STATUS.SUCCEEDED,
        stripeTransferId: transfer.id,
      };
    }
    catch (error: any) {
      transaction.transferStatus = TRANSFER_STATUS.FAILED;
      transaction.creatorEarningStatus = CREATOR_EARNING_STATUS.AVAILABLE;
      transaction.lastTransferError = error?.message || "Stripe transfer failed";
      await transaction.save();

      return {
        transactionId,
        status: TRANSFER_STATUS.FAILED,
        error: transaction.lastTransferError,
      };
    }
  }

  async markDisputeCreated(params: {
    disputeId: string;
    chargeId?: string | null;
    paymentIntentId?: string | null;
    reason?: string | null;
  }) {
    const identifiers = [
      ...(params.chargeId ? [{ stripeChargeId: params.chargeId }] : []),
      ...(params.paymentIntentId ? [{ stripePaymentIntentId: params.paymentIntentId }] : []),
    ];
    if (identifiers.length === 0)
      return null;

    return PaymentTransaction.findOneAndUpdate(
      {
        $or: identifiers,
      },
      {
        disputeStatus: DISPUTE_STATUS.OPEN,
        stripeDisputeId: params.disputeId,
        lastDisputeError: params.reason || "Stripe dispute created",
      },
      { new: true },
    ).exec();
  }

  async validateEventTicketPurchaseEligibility(eventId: string, payerId: string) {
    const event = await Event.findById(eventId).exec();
    if (!event)
      throw new NotFoundException("Event not found");

    if (event.status !== ACTIVITY_STATUS.APPROVED) {
      throw new BadRequestException("Ticket sales are not available for this event.");
    }
    if (event.creatorId.toString() === payerId) {
      throw new BadRequestException("Creator cannot buy own event ticket.");
    }
    if (event.endAt && event.endAt < new Date()) {
      throw new BadRequestException("Event ticket sales have ended.");
    }
    if (!event.endAt && event.startAt < new Date()) {
      throw new BadRequestException("Event already started.");
    }

    const existingTicket = await EventParticipant.findOne({
      eventId: event._id,
      userId: payerId,
      status: PARTICIPANT_STATUS.JOINED,
    }).lean();
    if (existingTicket) {
      throw new BadRequestException("Already joined");
    }

    const existingPaid = await PaymentTransaction.findOne({
      eventId: event._id,
      payerId,
      activePurchase: true,
      paymentStatus: PAYMENT_STATUS_SUCCEEDED,
      refundStatus: { $ne: REFUND_STATUS.SUCCEEDED },
    }).lean();
    if (existingPaid) {
      throw new BadRequestException("This event ticket is already paid.");
    }

    const existingPending = await PaymentTransaction.findOne({
      eventId: event._id,
      payerId,
      activePurchase: true,
      paymentStatus: PAYMENT_STATUS_PENDING,
    }).lean();
    if (!existingPending) {
      await this.ensureEventCapacityAvailable(event._id.toString());
    }

    const payableTicketPrice = this.calculatePayableTicketPrice(
      event.ticketPrice,
      event.discountPercentage || 0,
    );

    return { event, payableTicketPrice };
  }

  private async ensureEventCapacityAvailable(eventId: string) {
    const event = await Event.findById(eventId).select("participantLimit").lean();
    if (!event?.participantLimit)
      return;

    const [joinedCount, activePaymentCount] = await Promise.all([
      EventParticipant.countDocuments({
        eventId,
        status: PARTICIPANT_STATUS.JOINED,
      }),
      PaymentTransaction.countDocuments({
        eventId,
        activePurchase: true,
        paymentStatus: { $in: [PAYMENT_STATUS_PENDING, PAYMENT_STATUS_SUCCEEDED] },
        refundStatus: { $ne: REFUND_STATUS.SUCCEEDED },
      }),
    ]);

    // Pending PaymentTransactions reserve capacity so successful webhooks cannot oversell.
    const reservedSeats = Math.max(joinedCount, activePaymentCount);
    if (reservedSeats >= event.participantLimit) {
      throw new BadRequestException("Event is full");
    }
  }

  private getPurchaseLockKey(eventId: string, payerId: string) {
    return `event:${eventId}:payer:${payerId}`;
  }

  private async refreshEventJoinedCount(eventId: string) {
    const updatedCount = await EventParticipant.countDocuments({
      eventId,
      status: PARTICIPANT_STATUS.JOINED,
    });
    await Event.findByIdAndUpdate(eventId, {
      "stats.joinedCount": updatedCount,
    }).exec();
  }

  private calculatePayableTicketPrice(
    ticketPrice: number,
    discountPercentage: number,
  ): number {
    if (ticketPrice <= 0)
      return 0;
    if (discountPercentage <= 0)
      return ticketPrice;
    return Math.max(0, ticketPrice - (ticketPrice * discountPercentage) / 100);
  }

  private async getStripeConnectedBalanceSnapshot(creatorId: string) {
    const host = await User.findById(creatorId)
      .select("stripeAccountId stripeOnboardingCompleted")
      .lean();

    if (!host?.stripeAccountId || !host.stripeOnboardingCompleted) {
      return {
        accountId: host?.stripeAccountId || null,
        onboardingCompleted: Boolean(host?.stripeOnboardingCompleted),
        chargesEnabled: false,
        payoutsEnabled: false,
        availableBalance: 0,
        pendingBalance: 0,
        currency: "USD",
      };
    }

    try {
      const [account, balance] = await Promise.all([
        stripeService.retrieveConnectedAccount(host.stripeAccountId),
        stripeService.retrieveConnectedAccountBalance(host.stripeAccountId),
      ]);
      const currency = this.pickPrimaryBalanceCurrency(balance) || "usd";

      return {
        accountId: host.stripeAccountId,
        onboardingCompleted: true,
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
        availableBalance: Number(
          (this.getStripeBalanceAmount(balance.available, currency) / 100).toFixed(2),
        ),
        pendingBalance: Number(
          (this.getStripeBalanceAmount(balance.pending, currency) / 100).toFixed(2),
        ),
        currency: currency.toUpperCase(),
      };
    }
    catch {
      return {
        accountId: host.stripeAccountId,
        onboardingCompleted: true,
        chargesEnabled: false,
        payoutsEnabled: false,
        availableBalance: 0,
        pendingBalance: 0,
        currency: "USD",
      };
    }
  }

  private pickPrimaryBalanceCurrency(balance: {
    available?: Array<{ currency: string }>;
    pending?: Array<{ currency: string }>;
  }) {
    return balance.available?.[0]?.currency || balance.pending?.[0]?.currency || "usd";
  }

  private getStripeBalanceAmount(
    rows: Array<{ amount: number; currency: string }> = [],
    currency: string,
  ) {
    return rows
      .filter(row => row.currency.toLowerCase() === currency.toLowerCase())
      .reduce((sum, row) => sum + row.amount, 0);
  }

  private async listTransactionsCommon(input: {
    payerId?: string;
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = input.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = input.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};
    if (input.payerId)
      filter.payerId = input.payerId;
    if (input.status) {
      if (input.status === "succeeded") {
        filter.$or = [
          { paymentStatus: PAYMENT_STATUS_SUCCEEDED },
          { status: { $in: this.successfulPaymentStatuses } },
        ];
      }
      else {
        filter.$or = [
          { paymentStatus: input.status },
          { status: input.status },
        ];
      }
    }

    const [data, totalItems] = await Promise.all([
      PaymentTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      PaymentTransaction.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  private async listPayoutsCommon(input: {
    creatorId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = input.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (input.creatorId)
      filter.creatorId = input.creatorId;

    const [data, totalItems] = await Promise.all([
      PayoutRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      PayoutRequest.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }
}
