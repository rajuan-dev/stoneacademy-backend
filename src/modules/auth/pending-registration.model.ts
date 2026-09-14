import type { Document } from "mongoose";

import { model } from "mongoose";

import { ROLES } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";

export type IPendingRegistration = {
  email: string;
  fullName: string;
  country?: string;
  dob?: Date;
  passwordHash: string;
  role: (typeof ROLES)[keyof typeof ROLES];
  expiresAt: Date;
  meta?: {
    ip?: string;
    userAgent?: string;
  };
  createdAt: Date;
  updatedAt: Date;
} & Document;

const pendingRegistrationSchema
  = BaseSchemaUtil.createSchema<IPendingRegistration>({
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
    country: {
      type: String,
      trim: true,
      index: true,
    },
    dob: {
      type: Date,
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
