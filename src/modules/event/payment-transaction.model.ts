import { PAYMENT_STATUS } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IPaymentTransaction {
  _id: Types.ObjectId;
  payerId: Types.ObjectId;
  eventId: Types.ObjectId;
  grossAmount: number;
  currency: string;
  platformFeeAmount: number;
  creatorShareAmount: number;
  platformFeePercent: number;
  status: (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
  provider: string;
  providerReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
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
    creatorShareAmount: {
      type: Number,
      required: true,
      min: 0,
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
  },
);

paymentTransactionSchema.index({ eventId: 1, payerId: 1 });
paymentTransactionSchema.index({ createdAt: -1 });

export const PaymentTransaction = model<IPaymentTransaction>(
  "PaymentTransaction",
  paymentTransactionSchema,
);
