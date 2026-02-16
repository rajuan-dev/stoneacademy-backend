import { PAYMENT_STATUS } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface ISubscriptionPayment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  plan: "monthly" | "yearly";
  amount: number;
  currency: string;
  status: (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
  provider: string;
  providerReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPaymentSchema =
  BaseSchemaUtil.createSchema<ISubscriptionPayment>({
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    amount: {
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
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      default: "stripe",
      trim: true,
    },
    providerReference: {
      type: String,
      trim: true,
      index: true,
    },
  });

subscriptionPaymentSchema.index({ userId: 1, createdAt: -1 });

export const SubscriptionPayment = model<ISubscriptionPayment>(
  "SubscriptionPayment",
  subscriptionPaymentSchema,
);
