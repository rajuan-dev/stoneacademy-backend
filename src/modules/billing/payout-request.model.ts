import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IPayoutRequest {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  amount: number;
  currency: string;
  status: "requested" | "approved" | "rejected" | "paid";
  payoutMethod: "admin_request" | "self_withdrawal";
  provider?: string;
  providerPayoutId?: string | null;
  note?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const payoutRequestSchema = BaseSchemaUtil.createSchema<IPayoutRequest>({
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  currency: {
    type: String,
    required: true,
    default: "USD",
    trim: true,
  },
  status: {
    type: String,
    enum: ["requested", "approved", "rejected", "paid"],
    default: "requested",
    index: true,
  },
  payoutMethod: {
    type: String,
    enum: ["admin_request", "self_withdrawal"],
    default: "admin_request",
    index: true,
  },
  provider: {
    type: String,
    trim: true,
    default: null,
  },
  providerPayoutId: {
    type: String,
    trim: true,
    default: null,
    sparse: true,
    index: true,
  },
  note: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  reviewedAt: {
    type: Date,
  },
});

payoutRequestSchema.index({ creatorId: 1, createdAt: -1 });

export const PayoutRequest = model<IPayoutRequest>(
  "PayoutRequest",
  payoutRequestSchema,
);
