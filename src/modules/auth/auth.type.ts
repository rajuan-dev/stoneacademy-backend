// file: src/modules/auth/auth.type.ts

import type { ROLES } from "@/constants/app.constants";
import type { UserResponse } from "../user/user.type";
import type { OtpPurpose } from "../otp/otp.model";

/**
 * Register Payload - common fields only
 */
export type RegisterPayload = {
  email: string;
  password: string;
  confirmPassword?: string;
  fullName: string;
  country: string;
  dob?: Date;
  role?: (typeof ROLES)["USER"];
  meta?: {
    ip?: string;
    userAgent?: string;
  };
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type JWTTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

/**
 * Auth Service Response (UPDATED)
 * Service layer returns both tokens
 */
export type AuthServiceResponse = {
  user: UserResponse;
  tokens: JWTTokens;
};

/**
 * Auth Token Response (for API responses)
 */
export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

/**
 * Auth Controller Response (NEW)
 * Controller layer returns only access token in JSON
 */
export type AuthControllerResponse = {
  user: UserResponse;
  accessToken: string; // Only access token in JSON
  expiresIn: string;
};

/**
 * Change password payload
 */
export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type VerifyOtpPayload = {
  email: string;
  purpose: OtpPurpose;
  code: string;
};

export type SendOtpPayload = {
  email: string;
  purpose: OtpPurpose;
  meta?: {
    ip?: string;
    userAgent?: string;
  };
};
