import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IReport {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  entityType: "user" | "activity" | "event" | "message";
  entityId: Types.ObjectId;
  reason: string;
  details?: string;
  status: "open" | "under_review" | "resolved" | "rejected";
  adminNote?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = BaseSchemaUtil.createSchema<IReport>({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  entityType: {
    type: String,
    enum: ["user", "activity", "event", "message"],
    required: true,
    index: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 250,
  },
  details: {
    type: String,
    trim: true,
    maxlength: 3000,
  },
  status: {
    type: String,
    enum: ["open", "under_review", "resolved", "rejected"],
    default: "open",
    index: true,
  },
  adminNote: {
    type: String,
    trim: true,
    maxlength: 3000,
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  resolvedAt: {
    type: Date,
  },
});

reportSchema.index({ status: 1, createdAt: -1 });

export const Report = model<IReport>("Report", reportSchema);
