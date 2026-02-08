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
  cancelledAt?: Date;
  paymentProvider?: string;
  externalSubscriptionId?: string;
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
  cancelledAt: {
    type: Date,
  },
  paymentProvider: {
    type: String,
    trim: true,
  },
  externalSubscriptionId: {
    type: String,
    trim: true,
  },
});

subscriptionSchema.index({ userId: 1, status: 1, endAt: -1 });

export const Subscription = model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
