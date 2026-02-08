import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IPayoutRequest {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  amount: number;
  currency: string;
  status: "requested" | "approved" | "rejected" | "paid";
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
