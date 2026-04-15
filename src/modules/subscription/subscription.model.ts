import { SUBSCRIPTION_STATUS } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface ISubscription {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  plan: "monthly" | "yearly";
  status: (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
  startAt: Date;
  endAt: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelledAt?: Date;
  cancelAtPeriodEnd?: boolean;
  paymentProvider?: string;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  externalPriceId?: string;
  latestInvoiceId?: string;
  latestPaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = BaseSchemaUtil.createSchema<ISubscription>({
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
  status: {
    type: String,
    enum: Object.values(SUBSCRIPTION_STATUS),
    default: SUBSCRIPTION_STATUS.ACTIVE,
    index: true,
  },
  startAt: {
    type: Date,
    required: true,
  },
  endAt: {
    type: Date,
    required: true,
    index: true,
  },
  currentPeriodStart: {
    type: Date,
  },
  currentPeriodEnd: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
  },
  paymentProvider: {
    type: String,
    trim: true,
  },
  externalCustomerId: {
    type: String,
    trim: true,
    index: true,
  },
  externalSubscriptionId: {
    type: String,
    trim: true,
    index: true,
  },
  externalPriceId: {
    type: String,
    trim: true,
  },
  latestInvoiceId: {
    type: String,
    trim: true,
  },
  latestPaymentIntentId: {
    type: String,
    trim: true,
  },
});

subscriptionSchema.index({ userId: 1, status: 1, endAt: -1 });
subscriptionSchema.index({ userId: 1, externalSubscriptionId: 1 });

export const Subscription = model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
