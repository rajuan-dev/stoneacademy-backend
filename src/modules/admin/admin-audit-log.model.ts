import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IAdminAuditLog {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const adminAuditLogSchema = BaseSchemaUtil.createSchema<IAdminAuditLog>({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  entityType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  meta: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });

export const AdminAuditLog = model<IAdminAuditLog>(
  "AdminAuditLog",
  adminAuditLogSchema,
);
