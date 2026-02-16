// file: src/modules/auth/auth.utils.ts
import { AUTH, OTP } from "@/constants/app.constants";
import { ErrorCodeEnum } from "@/enums/error-code.enum";
import { env } from "@/env";
import { UnauthorizedException } from "@/utils/app-error.utils";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { SignOptions, Secret } from "jsonwebtoken";
import type { JWTPayload } from "../user/user.type";

export class AuthUtil {
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET as Secret, {
      expiresIn: env.JWT_EXPIRY || AUTH.ACCESS_TOKEN_EXPIRY,
    } as SignOptions);
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_REFRESH_SECRET as Secret, {
      expiresIn: env.JWT_REFRESH_EXPIRY || AUTH.REFRESH_TOKEN_EXPIRY,
    } as SignOptions);
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET as Secret);
      return decoded as JWTPayload;
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired access token",
        ErrorCodeEnum.AUTH_TOKEN_INVALID,
      );
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET as Secret);
      return decoded as JWTPayload;
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired refresh token",
        ErrorCodeEnum.AUTH_TOKEN_INVALID,
      );
    }
  }

  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  static generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  static generateOTP(): string {
    const min = Math.pow(10, OTP.LENGTH - 1);
    const max = Math.pow(10, OTP.LENGTH) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  static getTokenExpirationTime(expiryString: string): Date {
    const expiryDate = new Date();
    const match = expiryString.match(/(\d+)([dhms])/);
    if (!match) return expiryDate;

    const value = Number.parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "d":
        expiryDate.setDate(expiryDate.getDate() + value);
        break;
      case "h":
        expiryDate.setHours(expiryDate.getHours() + value);
        break;
      case "m":
        expiryDate.setMinutes(expiryDate.getMinutes() + value);
        break;
      case "s":
        expiryDate.setSeconds(expiryDate.getSeconds() + value);
        break;
    }

    return expiryDate;
  }

  static getOTPExpirationTime(): Date {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + OTP.EXPIRY_MINUTES);
    return expiryDate;
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static generateVerificationLink(baseURL: string, token: string): string {
    return `${baseURL}/api/v1/auth/verify-email?token=${token}`;
  }

  static generatePasswordResetLink(baseURL: string, token: string): string {
    return `${baseURL}/api/v1/auth/reset-password?token=${token}`;
  }
}
