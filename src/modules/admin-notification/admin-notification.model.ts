import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IAdminNotification {
  _id: Types.ObjectId;
  adminId?: Types.ObjectId | null;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminNotificationSchema = BaseSchemaUtil.createSchema<IAdminNotification>({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: "Admin",
    default: null,
    index: true,
  },
  type: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  data: {
    type: Schema.Types.Mixed,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
});

adminNotificationSchema.index({ adminId: 1, createdAt: -1 });

export const AdminNotification = model<IAdminNotification>(
  "AdminNotification",
  adminNotificationSchema,
);
