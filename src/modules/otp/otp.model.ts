// file: src/modules/otp/otp.model.ts

import { OTP_PURPOSES } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export type OtpPurpose =
  (typeof OTP_PURPOSES)[keyof typeof OTP_PURPOSES];

export interface IOtpCode {
  _id: Types.ObjectId;
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt?: Date;
  consumedAt?: Date;
  meta?: {
    ip?: string;
    userAgent?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const otpCodeSchema = BaseSchemaUtil.createSchema<IOtpCode>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  purpose: {
    type: String,
    enum: Object.values(OTP_PURPOSES),
    required: true,
    index: true,
  },
  codeHash: {
    type: String,
    required: true,
    select: false,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastSentAt: {
    type: Date,
  },
  consumedAt: {
    type: Date,
  },
  meta: {
    ip: { type: String },
    userAgent: { type: String },
  },
});

otpCodeSchema.index({ email: 1, purpose: 1 });
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCode = model<IOtpCode>("OtpCode", otpCodeSchema);
