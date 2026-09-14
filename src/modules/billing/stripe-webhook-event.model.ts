import type { Types } from "mongoose";

import { model } from "mongoose";

import { BaseSchemaUtil } from "@/utils/base-schema.utils";

export type IStripeWebhookEvent = {
  _id: Types.ObjectId;
  stripeEventId: string;
  eventType: string;
  status: "processing" | "processed" | "failed";
  processedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

const stripeWebhookEventSchema = BaseSchemaUtil.createSchema<IStripeWebhookEvent>({
  stripeEventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  eventType: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["processing", "processed", "failed"],
    default: "processing",
    index: true,
  },
  processedAt: {
    type: Date,
  },
  error: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
});

export const StripeWebhookEvent = model<IStripeWebhookEvent>(
  "StripeWebhookEvent",
  stripeWebhookEventSchema,
);
