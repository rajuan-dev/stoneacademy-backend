import { ROLES } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, type Document } from "mongoose";

export interface IPendingRegistration extends Document {
  email: string;
  fullName: string;
  passwordHash: string;
  role: (typeof ROLES)[keyof typeof ROLES];
  expiresAt: Date;
  meta?: {
    ip?: string;
    userAgent?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const pendingRegistrationSchema =
  BaseSchemaUtil.createSchema<IPendingRegistration>({
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      default: ROLES.USER,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    meta: {
      ip: { type: String },
      userAgent: { type: String },
    },
  });

pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingRegistration = model<IPendingRegistration>(
  "PendingRegistration",
  pendingRegistrationSchema,
);
