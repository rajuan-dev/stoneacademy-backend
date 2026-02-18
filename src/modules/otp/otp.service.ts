// file: src/modules/otp/otp.service.ts

import { AUTH, OTP_PURPOSES } from "@/constants/app.constants";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { BadRequestException } from "@/utils/app-error.utils";
import crypto from "crypto";
import { OTPService } from "@/services/otp.service";
import { OtpCode, type IOtpCode, type OtpPurpose } from "./otp.model";

const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

export class OtpService {
  private otpGenerator: OTPService;
  private secret: string;

  constructor() {
    this.otpGenerator = new OTPService({
      length: AUTH.OTP_LENGTH,
      expiryMinutes: AUTH.OTP_EXPIRY_MINUTES,
      allowDuplicates: false,
      trackingEnabled: true,
      maxTrackedOTPs: 200,
    });
    this.secret = env.OTP_SECRET || env.JWT_SECRET;
  }

  async sendOtp(params: {
    email: string;
    purpose: OtpPurpose;
    meta?: { ip?: string; userAgent?: string };
  }): Promise<{ code: string; expiresAt: Date; expiresInMinutes: number }> {
    const email = params.email.toLowerCase();
    const existing = await OtpCode.findOne({
      email,
      purpose: params.purpose,
      consumedAt: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .select("+codeHash")
      .exec();

    if (existing?.lastSentAt) {
      const diffSeconds = Math.floor(
        (Date.now() - existing.lastSentAt.getTime()) / 1000,
      );
      if (diffSeconds < DEFAULT_RESEND_COOLDOWN_SECONDS) {
        throw new BadRequestException(
          "Please wait before requesting another code.",
        );
      }
    }

    const generated = this.otpGenerator.generate("OTP");
    const codeHash = this.hashCode(generated.code);

    if (existing) {
      existing.codeHash = codeHash;
      existing.expiresAt = generated.expiresAt;
      existing.attempts = 0;
      existing.lastSentAt = new Date();
      existing.consumedAt = undefined;
      existing.meta = params.meta;
      await existing.save();
    } else {
      await OtpCode.create({
        email,
        purpose: params.purpose,
        codeHash,
        expiresAt: generated.expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
        meta: params.meta,
      });
    }

    return {
      code: generated.code,
      expiresAt: generated.expiresAt,
      expiresInMinutes: Math.ceil(generated.expiresInSeconds / 60),
    };
  }

  async verifyOtp(params: {
    email: string;
    purpose: OtpPurpose;
    code: string;
  }): Promise<IOtpCode> {
    const email = params.email.toLowerCase();
    const record = await OtpCode.findOne({
      email,
      purpose: params.purpose,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select("+codeHash")
      .exec();

    if (!record) {
      throw new BadRequestException("OTP is invalid or expired");
    }

    if (record.attempts >= AUTH.OTP_MAX_ATTEMPTS) {
      throw new BadRequestException("Maximum OTP attempts exceeded");
    }

    const incomingHash = this.hashCode(params.code);
    if (incomingHash !== record.codeHash) {
      record.attempts += 1;
      await record.save();
      throw new BadRequestException("Invalid OTP code");
    }

    record.consumedAt = new Date();
    await record.save();

    return record;
  }

  async isOtpAlreadyVerified(params: {
    email: string;
    purpose: OtpPurpose;
    code: string;
  }): Promise<boolean> {
    const email = params.email.toLowerCase();
    const record = await OtpCode.findOne({
      email,
      purpose: params.purpose,
      consumedAt: { $exists: true },
      expiresAt: { $gt: new Date() },
    })
      .sort({ consumedAt: -1, createdAt: -1 })
      .select("+codeHash")
      .exec();

    if (!record) {
      return false;
    }

    const incomingHash = this.hashCode(params.code);
    return incomingHash === record.codeHash;
  }

  async hasVerifiedOtpSession(params: {
    email: string;
    purpose: OtpPurpose;
  }): Promise<boolean> {
    const email = params.email.toLowerCase();
    const record = await OtpCode.findOne({
      email,
      purpose: params.purpose,
      consumedAt: { $exists: true },
      expiresAt: { $gt: new Date() },
    })
      .sort({ consumedAt: -1, createdAt: -1 })
      .select("_id")
      .exec();

    return Boolean(record);
  }

  async clearOtpRecords(params: {
    email: string;
    purpose: OtpPurpose;
  }): Promise<void> {
    await OtpCode.deleteMany({
      email: params.email.toLowerCase(),
      purpose: params.purpose,
    }).exec();
  }

  private hashCode(code: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(code)
      .digest("hex");
  }
}

export const otpService = new OtpService();
