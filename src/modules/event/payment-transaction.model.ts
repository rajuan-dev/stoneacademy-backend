import type { Types } from "mongoose";

import { model, Schema } from "mongoose";

import {
  CREATOR_EARNING_STATUS,
  DISPUTE_STATUS,
  PAYMENT_ARCHITECTURE,
  PAYMENT_STATUS,
  REFUND_STATUS,
  TRANSFER_STATUS,
} from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";

export type IPaymentTransaction = {
  _id: Types.ObjectId;
  payerId: Types.ObjectId;
  eventId: Types.ObjectId;
  creatorId?: Types.ObjectId;
  grossAmount: number;
  grossAmountMinor?: number;
  currency: string;
  platformFeeAmount: number;
  platformFeeAmountMinor?: number;
  creatorShareAmount: number;
  creatorShareAmountMinor?: number;
  refundedAmountMinor?: number;
  platformFeePercent: number;
  status: (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
  paymentStatus?: "pending" | "succeeded" | "failed" | "refunded";
  creatorEarningStatus?: "pending" | "available" | "transferred" | "cancelled";
  refundStatus?: "none" | "pending" | "succeeded" | "failed";
  transferStatus?: "not_created" | "pending" | "succeeded" | "failed";
  disputeStatus?: "none" | "open" | "closed";
  provider: string;
  providerReference?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeRefundId?: string;
  stripeTransferId?: string;
  stripeDisputeId?: string;
  paymentArchitecture?: string;
  transferGroup?: string;
  purchaseLockKey?: string;
  activePurchase?: boolean;
  paymentFailedReason?: string;
  lastRefundError?: string;
  lastTransferError?: string;
  lastDisputeError?: string;
  transferredAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const paymentTransactionSchema = BaseSchemaUtil.createSchema<IPaymentTransaction>(
  {
    payerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    grossAmountMinor: {
      type: Number,
      min: 0,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
      trim: true,
    },
    platformFeeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFeeAmountMinor: {
      type: Number,
      min: 0,
    },
    creatorShareAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    creatorShareAmountMinor: {
      type: Number,
      min: 0,
    },
    refundedAmountMinor: {
      type: Number,
      min: 0,
      default: 0,
    },
    platformFeePercent: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    creatorEarningStatus: {
      type: String,
      enum: Object.values(CREATOR_EARNING_STATUS),
      default: CREATOR_EARNING_STATUS.PENDING,
      index: true,
    },
    refundStatus: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.NONE,
      index: true,
    },
    transferStatus: {
      type: String,
      enum: Object.values(TRANSFER_STATUS),
      default: TRANSFER_STATUS.NOT_CREATED,
      index: true,
    },
    disputeStatus: {
      type: String,
      enum: Object.values(DISPUTE_STATUS),
      default: DISPUTE_STATUS.NONE,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      default: "manual",
      trim: true,
    },
    providerReference: {
      type: String,
      trim: true,
    },
    stripePaymentIntentId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    stripeChargeId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    stripeRefundId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    stripeTransferId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    stripeDisputeId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    paymentArchitecture: {
      type: String,
      enum: Object.values(PAYMENT_ARCHITECTURE),
      default: PAYMENT_ARCHITECTURE.PLATFORM_CHARGE_DELAYED_TRANSFER,
      index: true,
    },
    transferGroup: {
      type: String,
      trim: true,
      index: true,
    },
    purchaseLockKey: {
      type: String,
      trim: true,
    },
    activePurchase: {
      type: Boolean,
      default: false,
      index: true,
    },
    paymentFailedReason: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    lastRefundError: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    lastTransferError: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    lastDisputeError: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    transferredAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
  },
);

paymentTransactionSchema.index({ eventId: 1, payerId: 1 });
paymentTransactionSchema.index({ createdAt: -1 });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });
paymentTransactionSchema.index({ status: 1, eventId: 1, createdAt: -1 });
paymentTransactionSchema.index({ paymentStatus: 1, eventId: 1, createdAt: -1 });
paymentTransactionSchema.index({ creatorEarningStatus: 1, transferStatus: 1, eventId: 1 });
paymentTransactionSchema.index(
  { purchaseLockKey: 1 },
  {
    unique: true,
    partialFilterExpression: { activePurchase: true },
  },
);

export const PaymentTransaction = model<IPaymentTransaction>(
  "PaymentTransaction",
  paymentTransactionSchema,
);
