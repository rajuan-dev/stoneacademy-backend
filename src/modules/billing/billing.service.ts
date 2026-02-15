import { PAGINATION } from "@/constants/app.constants";
import { notificationService } from "@/modules/notification/notification.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { Types } from "mongoose";
import { Event } from "../event/event.model";
import { PaymentTransaction } from "../event/payment-transaction.model";
import { PayoutRequest } from "./payout-request.model";

export class BillingService {
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
          status: "succeeded",
        },
      },
      {
        $group: {
          _id: null,
          totalGross: { $sum: "$grossAmount" },
          totalPlatformFee: { $sum: "$platformFeeAmount" },
          totalCreatorShare: { $sum: "$creatorShareAmount" },
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
    const totalPaidOut = payoutSummary?.totalRequested || 0;
    const availableBalance = Math.max(0, Number((totalCreatorShare - totalPaidOut).toFixed(2)));

    return {
      totalGross: summary?.totalGross || 0,
      totalPlatformFee: summary?.totalPlatformFee || 0,
      totalCreatorShare,
      transactionsCount: summary?.transactionsCount || 0,
      totalPaidOut,
      availableBalance,
      currency: "USD",
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
    });
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
    if (!payout) throw new NotFoundException("Payout request not found");

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
    return PaymentTransaction.findOneAndUpdate(
      { providerReference, provider },
      { status: "succeeded" },
      { new: true },
    ).exec();
  }

  async createOrGetPendingTransactionForEvent(params: {
    eventId: string;
    payerId: string;
  }) {
    const event = await Event.findById(params.eventId).exec();
    if (!event) throw new NotFoundException("Event not found");

    const existing = await PaymentTransaction.findOne({
      eventId: params.eventId,
      payerId: params.payerId,
      status: "pending",
    }).sort({ createdAt: -1 }).exec();
    if (existing) return existing;

    const grossAmount = Number(
      this.calculatePayableTicketPrice(
        event.ticketPrice,
        event.discountPercentage || 0,
      ).toFixed(2),
    );

    if (grossAmount <= 0) {
      throw new BadRequestException("This event is free. No payment is required.");
    }

    const platformFeeAmount = Number(((grossAmount * 10) / 100).toFixed(2));
    const creatorShareAmount = Number((grossAmount - platformFeeAmount).toFixed(2));

    return PaymentTransaction.create({
      eventId: event._id,
      payerId: params.payerId,
      grossAmount,
      currency: event.currency || "USD",
      platformFeeAmount,
      creatorShareAmount,
      platformFeePercent: 10,
      status: "pending",
      provider: "stripe",
    });
  }

  private calculatePayableTicketPrice(
    ticketPrice: number,
    discountPercentage: number,
  ): number {
    if (ticketPrice <= 0) return 0;
    if (discountPercentage <= 0) return ticketPrice;
    return Math.max(0, ticketPrice - (ticketPrice * discountPercentage) / 100);
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
    if (input.payerId) filter.payerId = input.payerId;
    if (input.status) filter.status = input.status;

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
    if (input.creatorId) filter.creatorId = input.creatorId;

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
