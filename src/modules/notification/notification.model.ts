import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = BaseSchemaUtil.createSchema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
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

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = model<INotification>(
  "Notification",
  notificationSchema,
);
