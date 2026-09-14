import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACTIVITY_STATUS,
  CREATOR_EARNING_STATUS,
  DISPUTE_STATUS,
  PAYMENT_ARCHITECTURE,
  REFUND_STATUS,
  TRANSFER_STATUS,
} from "../src/constants/app.constants";
import { AdminService } from "../src/modules/admin/admin.service";
import { BillingService } from "../src/modules/billing/billing.service";
import {
  amountMajorToMinor,
  calculateEventRevenueSplit,
} from "../src/modules/billing/event-revenue.util";

const mocks = vi.hoisted(() => ({
  adminAuditCreateMock: vi.fn(),
  createConnectedAccountPayoutMock: vi.fn(),
  createCreatorTransferMock: vi.fn(),
  createEventCancellationRefundMock: vi.fn(),
  createEventPaymentIntentMock: vi.fn(),
  eventCountDocumentsMock: vi.fn(),
  eventFindByIdAndUpdateMock: vi.fn(),
  eventFindByIdMock: vi.fn(),
  eventParticipantCountDocumentsMock: vi.fn(),
  eventParticipantFindOneAndUpdateMock: vi.fn(),
  eventParticipantFindOneMock: vi.fn(),
  notificationCreateMock: vi.fn(),
  paymentTransactionAggregateMock: vi.fn(),
  paymentTransactionCountDocumentsMock: vi.fn(),
  paymentTransactionFindByIdAndUpdateMock: vi.fn(),
  paymentTransactionFindByIdMock: vi.fn(),
  paymentTransactionFindMock: vi.fn(),
  paymentTransactionFindOneAndUpdateMock: vi.fn(),
  paymentTransactionFindOneMock: vi.fn(),
  payoutRequestCreateMock: vi.fn(),
  retrieveConnectedAccountBalanceMock: vi.fn(),
  retrieveConnectedAccountMock: vi.fn(),
  userFindByIdMock: vi.fn(),
}));

vi.mock("../src/services/stripe.service", () => ({
  stripeService: {
    createConnectedAccountPayout: mocks.createConnectedAccountPayoutMock,
    createCreatorTransfer: mocks.createCreatorTransferMock,
    createEventCancellationRefund: mocks.createEventCancellationRefundMock,
    createEventPaymentIntent: mocks.createEventPaymentIntentMock,
    retrieveConnectedAccount: mocks.retrieveConnectedAccountMock,
    retrieveConnectedAccountBalance: mocks.retrieveConnectedAccountBalanceMock,
  },
}));

vi.mock("../src/modules/event/payment-transaction.model", () => ({
  PaymentTransaction: {
    aggregate: mocks.paymentTransactionAggregateMock,
    countDocuments: mocks.paymentTransactionCountDocumentsMock,
    find: mocks.paymentTransactionFindMock,
    findById: mocks.paymentTransactionFindByIdMock,
    findByIdAndUpdate: mocks.paymentTransactionFindByIdAndUpdateMock,
    findOne: mocks.paymentTransactionFindOneMock,
    findOneAndUpdate: mocks.paymentTransactionFindOneAndUpdateMock,
  },
}));

vi.mock("../src/modules/event/event.model", () => ({
  Event: {
    countDocuments: mocks.eventCountDocumentsMock,
    findById: mocks.eventFindByIdMock,
    findByIdAndUpdate: mocks.eventFindByIdAndUpdateMock,
  },
}));

vi.mock("../src/modules/event/event-participant.model", () => ({
  EventParticipant: {
    countDocuments: mocks.eventParticipantCountDocumentsMock,
    findOne: mocks.eventParticipantFindOneMock,
    findOneAndUpdate: mocks.eventParticipantFindOneAndUpdateMock,
  },
}));

vi.mock("../src/modules/user/user.model", () => ({
  User: {
    findById: mocks.userFindByIdMock,
  },
}));

vi.mock("../src/modules/billing/payout-request.model", () => ({
  PayoutRequest: {
    aggregate: vi.fn().mockResolvedValue([]),
    create: mocks.payoutRequestCreateMock,
    countDocuments: vi.fn().mockResolvedValue(0),
    find: vi.fn(),
  },
}));

vi.mock("../src/modules/notification/notification.service", () => ({
  notificationService: {
    create: mocks.notificationCreateMock,
  },
}));

vi.mock("../src/modules/admin/admin-audit-log.model", () => ({
  AdminAuditLog: {
    create: mocks.adminAuditCreateMock,
  },
}));

vi.mock("../src/modules/settings/settings.service", () => ({
  SettingsService: class SettingsService {},
}));

vi.mock("../src/modules/user/user.service", () => ({
  UserService: class UserService {},
}));

vi.mock("../src/modules/admin-account/admin-account.service", () => ({
  AdminAccountService: class AdminAccountService {},
}));

vi.mock("../src/modules/activity/activity.model", () => ({ Activity: {} }));
vi.mock("../src/modules/report/report.model", () => ({ Report: {} }));
vi.mock("../src/modules/support/support-ticket.model", () => ({ SupportTicket: {} }));
vi.mock("../src/modules/admin-account/admin-account.model", () => ({ AdminAccount: { collection: { name: "adminaccounts" } } }));
vi.mock("../src/modules/subscription/subscription.model", () => ({ Subscription: {} }));
vi.mock("../src/modules/subscription/subscription-payment.model", () => ({ SubscriptionPayment: {} }));

function queryResult<T>(value: T) {
  const chain = {
    exec: vi.fn().mockResolvedValue(value),
    lean: vi.fn().mockResolvedValue(value),
    limit: vi.fn(() => chain),
    populate: vi.fn(() => chain),
    select: vi.fn(() => chain),
    skip: vi.fn(() => chain),
    sort: vi.fn(() => chain),
  };
  return chain;
}

function objectId(id: string) {
  return {
    toString: () => id,
  };
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    _id: objectId("event_1"),
    creatorId: objectId("creator_1"),
    currency: "USD",
    discountPercentage: 0,
    endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    participantLimit: 10,
    startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: ACTIVITY_STATUS.APPROVED,
    ticketPrice: 100,
    ...overrides,
  };
}

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    _id: objectId("trx_1"),
    creatorId: objectId("creator_1"),
    creatorShareAmount: 90,
    creatorShareAmountMinor: 9000,
    currency: "USD",
    disputeStatus: DISPUTE_STATUS.NONE,
    eventId: objectId("event_1"),
    grossAmount: 100,
    grossAmountMinor: 10000,
    payerId: objectId("user_1"),
    paymentArchitecture: PAYMENT_ARCHITECTURE.PLATFORM_CHARGE_DELAYED_TRANSFER,
    paymentStatus: "succeeded",
    provider: "stripe",
    providerReference: "pi_123",
    refundStatus: REFUND_STATUS.NONE,
    refundedAmountMinor: 0,
    save: vi.fn().mockResolvedValue(undefined),
    stripeChargeId: "ch_123",
    stripePaymentIntentId: "pi_123",
    transferGroup: "event_event_1_payer_user_1",
    transferStatus: TRANSFER_STATUS.NOT_CREATED,
    ...overrides,
  };
}

describe("event payment financial safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates 90/10 split in integer minor units", () => {
    const split = calculateEventRevenueSplit(amountMajorToMinor(100));

    expect(split.grossAmountMinor).toBe(10000);
    expect(split.platformFeeAmountMinor).toBe(1000);
    expect(split.creatorShareAmountMinor).toBe(9000);
    expect(split.platformFeeAmountMinor + split.creatorShareAmountMinor)
      .toBe(split.grossAmountMinor);
  });

  it("creates event PaymentIntent as a platform charge without destination transfer", async () => {
    const payment = transaction({ paymentStatus: "pending" });
    mocks.paymentTransactionFindByIdMock.mockReturnValueOnce(queryResult(payment));
    mocks.createEventPaymentIntentMock.mockResolvedValueOnce({
      client_secret: "secret",
      id: "pi_new",
    });

    const service = new BillingService();
    await service.createEventPaymentIntentForTransaction("trx_1");

    const [params, idempotencyKey] = mocks.createEventPaymentIntentMock.mock.calls[0];
    expect(params.amount).toBe(10000);
    expect(params.currency).toBe("usd");
    expect(params.transfer_data).toBeUndefined();
    expect(params.application_fee_amount).toBeUndefined();
    expect(params.metadata.paymentArchitecture)
      .toBe(PAYMENT_ARCHITECTURE.PLATFORM_CHARGE_DELAYED_TRANSFER);
    expect(idempotencyKey).toBe("event-ticket-trx_1");
    expect(payment.providerReference).toBe("pi_new");
    expect(payment.save).toHaveBeenCalledOnce();
  });

  it("creates a pending transaction from server-side event price and reserves one active purchase", async () => {
    mocks.eventFindByIdMock
      .mockReturnValueOnce(queryResult(event({ ticketPrice: 100 })))
      .mockReturnValueOnce(queryResult({ participantLimit: 5 }));
    mocks.eventParticipantFindOneMock.mockReturnValueOnce(queryResult(null));
    mocks.paymentTransactionFindOneMock
      .mockReturnValueOnce(queryResult(null))
      .mockReturnValueOnce(queryResult(null));
    mocks.eventParticipantCountDocumentsMock.mockResolvedValueOnce(0);
    mocks.paymentTransactionCountDocumentsMock.mockResolvedValueOnce(0);
    mocks.paymentTransactionFindOneAndUpdateMock.mockReturnValueOnce(
      queryResult(transaction({ paymentStatus: "pending" })),
    );

    const service = new BillingService();
    await service.createOrGetPendingTransactionForEvent({
      eventId: "event_1",
      payerId: "user_1",
    });

    const [findFilter, update, options] = mocks.paymentTransactionFindOneAndUpdateMock.mock.calls[0];
    expect(findFilter).toMatchObject({
      activePurchase: true,
      paymentStatus: "pending",
      purchaseLockKey: "event:event_1:payer:user_1",
    });
    expect(update.$setOnInsert.grossAmountMinor).toBe(10000);
    expect(update.$setOnInsert.creatorShareAmountMinor).toBe(9000);
    expect(update.$setOnInsert.paymentArchitecture)
      .toBe(PAYMENT_ARCHITECTURE.PLATFORM_CHARGE_DELAYED_TRANSFER);
    expect(options).toMatchObject({ new: true, setDefaultsOnInsert: true, upsert: true });
  });

  it("rejects cancelled, completed, or past event checkout before creating a transaction", async () => {
    const service = new BillingService();

    mocks.eventFindByIdMock.mockReturnValueOnce(
      queryResult(event({ status: ACTIVITY_STATUS.CANCELLED })),
    );
    await expect(service.validateEventTicketPurchaseEligibility("event_1", "user_1"))
      .rejects
      .toThrow("Ticket sales are not available");

    mocks.eventFindByIdMock.mockReturnValueOnce(
      queryResult(event({ status: ACTIVITY_STATUS.COMPLETED })),
    );
    await expect(service.validateEventTicketPurchaseEligibility("event_1", "user_1"))
      .rejects
      .toThrow("Ticket sales are not available");

    mocks.eventFindByIdMock.mockReturnValueOnce(
      queryResult(event({ endAt: new Date(Date.now() - 1000) })),
    );
    await expect(service.validateEventTicketPurchaseEligibility("event_1", "user_1"))
      .rejects
      .toThrow("Event ticket sales have ended");
  });

  it("rejects full-capacity checkout and creator self-purchase", async () => {
    const service = new BillingService();

    mocks.eventFindByIdMock
      .mockReturnValueOnce(queryResult(event()))
      .mockReturnValueOnce(queryResult({ participantLimit: 1 }));
    mocks.eventParticipantFindOneMock.mockReturnValueOnce(queryResult(null));
    mocks.paymentTransactionFindOneMock
      .mockReturnValueOnce(queryResult(null))
      .mockReturnValueOnce(queryResult(null));
    mocks.eventParticipantCountDocumentsMock.mockResolvedValueOnce(1);
    mocks.paymentTransactionCountDocumentsMock.mockResolvedValueOnce(1);
    await expect(service.validateEventTicketPurchaseEligibility("event_1", "user_1"))
      .rejects
      .toThrow("Event is full");

    mocks.eventFindByIdMock.mockReturnValueOnce(
      queryResult(event({ creatorId: objectId("user_1") })),
    );
    await expect(service.validateEventTicketPurchaseEligibility("event_1", "user_1"))
      .rejects
      .toThrow("Creator cannot buy own event ticket");
  });

  it("marks successful payment while leaving creator earnings pending and participant upsert idempotent", async () => {
    const payment = transaction();
    mocks.paymentTransactionFindOneAndUpdateMock.mockReturnValue(queryResult(payment));
    mocks.eventFindByIdMock.mockReturnValue(queryResult(event()));
    mocks.paymentTransactionFindByIdMock.mockReturnValue(queryResult(payment));
    mocks.eventParticipantFindOneAndUpdateMock.mockReturnValue(queryResult({ _id: "participant_1" }));
    mocks.eventParticipantCountDocumentsMock.mockResolvedValue(1);
    mocks.eventFindByIdAndUpdateMock.mockReturnValue(queryResult({}));

    const service = new BillingService();
    await service.handleEventTicketPaymentSucceeded("pi_123", "ch_123");
    await service.handleEventTicketPaymentSucceeded("pi_123", "ch_123");

    const [, update] = mocks.paymentTransactionFindOneAndUpdateMock.mock.calls[0];
    expect(update).toMatchObject({
      creatorEarningStatus: CREATOR_EARNING_STATUS.PENDING,
      paymentStatus: "succeeded",
      stripeChargeId: "ch_123",
      transferStatus: TRANSFER_STATUS.NOT_CREATED,
    });
    const [, participantUpdate, participantOptions]
      = mocks.eventParticipantFindOneAndUpdateMock.mock.calls[0];
    expect(participantUpdate).toMatchObject({
      paymentTransactionId: payment._id,
      status: "joined",
    });
    expect(participantOptions).toMatchObject({
      new: true,
      setDefaultsOnInsert: true,
      upsert: true,
    });
    expect(mocks.eventParticipantFindOneAndUpdateMock).toHaveBeenCalledTimes(2);
  });

  it("marks failed event payments failed and releases active purchase lock without ticket creation", async () => {
    mocks.paymentTransactionFindOneAndUpdateMock.mockReturnValueOnce(
      queryResult({ _id: "trx_1" }),
    );

    const service = new BillingService();
    await service.markTransactionFailedByProviderRef("pi_failed", "card declined");

    expect(mocks.paymentTransactionFindOneAndUpdateMock).toHaveBeenCalledWith(
      {
        $or: [
          { providerReference: "pi_failed", provider: "stripe" },
          { stripePaymentIntentId: "pi_failed", provider: "stripe" },
        ],
      },
      {
        activePurchase: false,
        paymentFailedReason: "card declined",
        paymentStatus: "failed",
        status: "failed",
      },
      { new: true },
    );
    expect(mocks.eventParticipantFindOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("settles a completed event transaction with the creator share, destination, and stable idempotency key", async () => {
    const payment = transaction();
    mocks.paymentTransactionFindByIdMock.mockReturnValueOnce(queryResult(payment));
    mocks.eventFindByIdMock.mockReturnValueOnce(
      queryResult(event({ status: ACTIVITY_STATUS.COMPLETED })),
    );
    mocks.userFindByIdMock.mockReturnValueOnce(
      queryResult({
        _id: objectId("creator_1"),
        stripeAccountId: "acct_123",
        stripeOnboardingCompleted: true,
      }),
    );
    mocks.retrieveConnectedAccountMock.mockResolvedValueOnce({ charges_enabled: true });
    mocks.createCreatorTransferMock.mockResolvedValueOnce({ id: "tr_123" });

    const service = new BillingService();
    const result = await service.settlePaymentTransaction("trx_1");

    const [params, idempotencyKey] = mocks.createCreatorTransferMock.mock.calls[0];
    expect(params.amount).toBe(9000);
    expect(params.destination).toBe("acct_123");
    expect(params.transfer_group).toBe("event_event_1_payer_user_1");
    expect(idempotencyKey).toBe("event-earning-transfer-trx_1");
    expect(payment.transferStatus).toBe(TRANSFER_STATUS.SUCCEEDED);
    expect(payment.creatorEarningStatus).toBe(CREATOR_EARNING_STATUS.TRANSFERRED);
    expect(result).toMatchObject({ status: TRANSFER_STATUS.SUCCEEDED, stripeTransferId: "tr_123" });
  });

  it("does not duplicate an already succeeded creator transfer", async () => {
    mocks.paymentTransactionFindByIdMock.mockReturnValueOnce(
      queryResult(transaction({
        stripeTransferId: "tr_existing",
        transferStatus: TRANSFER_STATUS.SUCCEEDED,
      })),
    );

    const service = new BillingService();
    const result = await service.settlePaymentTransaction("trx_1");

    expect(result).toMatchObject({
      status: TRANSFER_STATUS.SUCCEEDED,
      stripeTransferId: "tr_existing",
    });
    expect(mocks.createCreatorTransferMock).not.toHaveBeenCalled();
  });

  it("settlement query skips refunded, cancelled, disputed, and already-transferred transactions", async () => {
    mocks.eventFindByIdMock.mockReturnValueOnce(
      queryResult(event({ status: ACTIVITY_STATUS.COMPLETED })),
    );
    mocks.paymentTransactionFindMock.mockReturnValueOnce(queryResult([]));

    const service = new BillingService();
    await service.settleCompletedEvent("event_1");

    expect(mocks.paymentTransactionFindMock).toHaveBeenCalledWith(expect.objectContaining({
      creatorEarningStatus: { $in: [CREATOR_EARNING_STATUS.PENDING, CREATOR_EARNING_STATUS.AVAILABLE] },
      disputeStatus: { $ne: DISPUTE_STATUS.OPEN },
      eventId: expect.anything(),
      paymentStatus: "succeeded",
      refundStatus: { $ne: REFUND_STATUS.SUCCEEDED },
      transferStatus: { $in: [TRANSFER_STATUS.NOT_CREATED, TRANSFER_STATUS.FAILED] },
    }));
  });

  it("blocked Connect onboarding leaves earnings retryable without losing creator balance", async () => {
    const payment = transaction();
    mocks.paymentTransactionFindByIdMock.mockReturnValueOnce(queryResult(payment));
    mocks.eventFindByIdMock.mockReturnValueOnce(
      queryResult(event({ status: ACTIVITY_STATUS.COMPLETED })),
    );
    mocks.userFindByIdMock.mockReturnValueOnce(
      queryResult({ stripeAccountId: null, stripeOnboardingCompleted: false }),
    );

    const service = new BillingService();
    const result = await service.settlePaymentTransaction("trx_1");

    expect(result).toMatchObject({
      error: "Creator Stripe onboarding is incomplete.",
      status: TRANSFER_STATUS.FAILED,
    });
    expect(payment.creatorEarningStatus).toBe(CREATOR_EARNING_STATUS.AVAILABLE);
    expect(payment.transferStatus).toBe(TRANSFER_STATUS.FAILED);
    expect(mocks.createCreatorTransferMock).not.toHaveBeenCalled();
  });

  it("creates full cancellation refunds with stable idempotency and never re-refunds succeeded refunds", async () => {
    const payment = transaction();
    mocks.paymentTransactionFindByIdMock.mockReturnValueOnce(queryResult(payment));
    mocks.createEventCancellationRefundMock.mockResolvedValueOnce({
      id: "re_123",
      status: "succeeded",
    });

    const service = new BillingService();
    await service.refundTransactionForEventCancellation("trx_1");

    const [params, idempotencyKey] = mocks.createEventCancellationRefundMock.mock.calls[0];
    expect(params.amount).toBe(10000);
    expect(params.payment_intent).toBe("pi_123");
    expect(params.metadata.refundReason).toBe("event_cancelled");
    expect(idempotencyKey).toBe("event-cancel-refund-trx_1");
    expect(payment.creatorEarningStatus).toBe(CREATOR_EARNING_STATUS.CANCELLED);
    expect(payment.refundStatus).toBe(REFUND_STATUS.SUCCEEDED);

    mocks.paymentTransactionFindByIdMock.mockReturnValueOnce(
      queryResult(transaction({ refundStatus: REFUND_STATUS.SUCCEEDED })),
    );
    await service.refundTransactionForEventCancellation("trx_1");
    expect(mocks.createEventCancellationRefundMock).toHaveBeenCalledTimes(1);
  });

  it("keeps failed Stripe refunds financially unrefunded so admin retry remains possible", async () => {
    const payment = transaction();
    mocks.paymentTransactionFindByIdMock.mockReturnValueOnce(queryResult(payment));
    mocks.createEventCancellationRefundMock.mockResolvedValueOnce({
      id: "re_failed",
      status: "failed",
    });

    const service = new BillingService();
    await service.refundTransactionForEventCancellation("trx_1");

    expect(payment.refundStatus).toBe(REFUND_STATUS.FAILED);
    expect(payment.refundedAmountMinor).toBe(0);
    expect(payment.paymentStatus).toBe("succeeded");
    expect(payment.status).toBe("completed");
    expect(payment.lastRefundError).toBe("Stripe refund status: failed");
  });

  it("continues cancellation refunds when one transaction fails and persists the failed row as retryable", async () => {
    const service = new BillingService();
    const first = transaction({ _id: objectId("trx_ok") });
    const second = transaction({ _id: objectId("trx_bad") });
    mocks.paymentTransactionFindMock.mockReturnValueOnce(queryResult([first, second]));

    vi.spyOn(service, "refundTransactionForEventCancellation")
      .mockResolvedValueOnce({ ...first, refundStatus: REFUND_STATUS.SUCCEEDED })
      .mockRejectedValueOnce(new Error("Stripe outage"));
    mocks.paymentTransactionFindByIdAndUpdateMock.mockReturnValueOnce(queryResult({}));

    const result = await service.processEventCancellationRefunds("event_1");

    expect(result).toEqual([
      { status: REFUND_STATUS.SUCCEEDED, transactionId: "trx_ok" },
      { error: "Stripe outage", status: REFUND_STATUS.FAILED, transactionId: "trx_bad" },
    ]);
    expect(mocks.paymentTransactionFindByIdAndUpdateMock).toHaveBeenCalledWith(
      second._id,
      {
        creatorEarningStatus: CREATOR_EARNING_STATUS.CANCELLED,
        lastRefundError: "Stripe outage",
        refundStatus: REFUND_STATUS.FAILED,
      },
    );
  });

  it("admin retry endpoint logic retries only failed refunds and skips already fully refunded rows", async () => {
    const failed = transaction({ _id: objectId("trx_failed"), refundStatus: REFUND_STATUS.FAILED });
    const fullyRefunded = transaction({
      _id: objectId("trx_full"),
      refundStatus: REFUND_STATUS.FAILED,
      refundedAmountMinor: 10000,
    });
    mocks.eventFindByIdMock.mockReturnValueOnce(
      queryResult(event({ _id: objectId("650000000000000000000001"), status: ACTIVITY_STATUS.CANCELLED })),
    );
    mocks.paymentTransactionFindMock.mockReturnValueOnce(queryResult([failed, fullyRefunded]));
    mocks.adminAuditCreateMock.mockResolvedValueOnce({});
    vi.spyOn(BillingService.prototype, "refundTransactionForEventCancellation")
      .mockResolvedValueOnce({ ...failed, refundStatus: REFUND_STATUS.SUCCEEDED });

    const service = new AdminService();
    const result = await service.retryFailedEventRefunds("650000000000000000000001", "admin_1");

    expect(mocks.paymentTransactionFindMock).toHaveBeenCalledWith(expect.objectContaining({
      $or: [
        { paymentStatus: "succeeded" },
        { status: { $in: ["completed", "succeeded"] } },
      ],
      eventId: expect.anything(),
      paymentArchitecture: PAYMENT_ARCHITECTURE.PLATFORM_CHARGE_DELAYED_TRANSFER,
      refundStatus: REFUND_STATUS.FAILED,
    }));
    expect(result).toMatchObject({
      retried: 1,
      skipped: 1,
      stillFailed: 0,
      succeeded: 1,
      totalFailed: 2,
    });
  });

  it("open disputes mark transactions and block future settlement", async () => {
    mocks.paymentTransactionFindOneAndUpdateMock.mockReturnValueOnce(
      queryResult(transaction({ disputeStatus: DISPUTE_STATUS.OPEN })),
    );

    const service = new BillingService();
    await service.markDisputeCreated({
      chargeId: "ch_123",
      disputeId: "dp_123",
      paymentIntentId: "pi_123",
      reason: "fraudulent",
    });

    expect(mocks.paymentTransactionFindOneAndUpdateMock).toHaveBeenCalledWith(
      {
        $or: [
          { stripeChargeId: "ch_123" },
          { stripePaymentIntentId: "pi_123" },
        ],
      },
      {
        disputeStatus: DISPUTE_STATUS.OPEN,
        lastDisputeError: "fraudulent",
        stripeDisputeId: "dp_123",
      },
      { new: true },
    );
  });

  it("creator self-withdrawal only uses connected-account Stripe balance and does not transfer pending event earnings", async () => {
    mocks.userFindByIdMock.mockReturnValueOnce(
      queryResult({
        email: "creator@example.com",
        stripeAccountId: "acct_123",
        stripeOnboardingCompleted: true,
      }),
    );
    mocks.retrieveConnectedAccountMock.mockResolvedValueOnce({
      charges_enabled: true,
      payouts_enabled: true,
    });
    mocks.retrieveConnectedAccountBalanceMock.mockResolvedValueOnce({
      available: [{ amount: 5000, currency: "usd" }],
      pending: [{ amount: 9000, currency: "usd" }],
    });
    mocks.createConnectedAccountPayoutMock.mockResolvedValueOnce({
      created: 1_700_000_000,
      id: "po_123",
      status: "paid",
    });
    mocks.payoutRequestCreateMock.mockResolvedValueOnce({
      _id: objectId("payout_1"),
      amount: 50,
      createdAt: new Date(),
    });

    const service = new BillingService();
    const result = await service.createSelfWithdrawal("creator_1", {});

    expect(mocks.createConnectedAccountPayoutMock).toHaveBeenCalledWith(
      "acct_123",
      expect.objectContaining({ amount: 5000, currency: "usd" }),
    );
    expect(mocks.createCreatorTransferMock).not.toHaveBeenCalled();
    expect(mocks.paymentTransactionAggregateMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      amount: 50,
      availableBalanceBefore: 50,
      pendingBalance: 90,
      stripePayoutId: "po_123",
    });
  });
});
