// file: src/modules/auth/auth.controller.ts

import { COOKIE_CONFIG } from "@/config/cookie.config";
import { MESSAGES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { UnauthorizedException } from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  changePasswordSchema,
  googleAuthSchema,
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  registerSchema,
  resetPasswordSchema,
  requestPasswordResetSchema,
} from "./auth.schema";
import { AuthService } from "./auth.service";
import { AuthControllerResponse } from "./auth.type";
import type { OtpPurpose } from "../otp/otp.model";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register endpoint
   * POST /auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(registerSchema, req);
    const result = await this.authService.register({
      ...validated.body,
      meta: {
        ip: req.ip,
        userAgent: req.get("User-Agent") || undefined,
      },
    });

    ApiResponse.created(res, result, MESSAGES.AUTH.REGISTER_SUCCESS);
  });

  /**
   * Login endpoint
   * POST /auth/login
   */
  login = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(loginSchema, req);
      const result = await this.authService.login(validated.body);

      res.cookie(
        COOKIE_CONFIG.REFRESH_TOKEN.name,
        result.tokens.refreshToken,
        COOKIE_CONFIG.REFRESH_TOKEN.options
      );

      const response: AuthControllerResponse = {
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
      };

      ApiResponse.success(res, response, MESSAGES.AUTH.LOGIN_SUCCESS);
    }
  );

  /**
   * Verify email with code
   * POST /auth/otp/verify
   */
  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(otpVerifySchema, req);
    const result = await this.authService.verifyOtp({
      ...validated.body,
      purpose: validated.body.purpose as OtpPurpose,
    });
    ApiResponse.success(res, result, "OTP verified successfully");
  });

  /**
   * Send OTP
   * POST /auth/otp/send
   */
  sendOtp = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(otpSendSchema, req);
    const result = await this.authService.sendOtp({
      email: validated.body.email,
      purpose: validated.body.purpose as OtpPurpose,
      meta: {
        ip: req.ip,
        userAgent: req.get("User-Agent") || undefined,
      },
    });

    ApiResponse.success(res, result, "OTP sent");
  });

  /**
   * Request password reset
   * POST /auth/password/forgot
   */
  requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(requestPasswordResetSchema, req);
    const result = await this.authService.requestPasswordReset(
      validated.body.email
    );
    ApiResponse.success(res, result, MESSAGES.AUTH.PASSWORD_RESET_OTP_SENT);
  });

  /**
   * Reset password
   * POST /auth/password/reset
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(resetPasswordSchema, req);
    const result = await this.authService.resetPassword(
      validated.body.email,
      validated.body.code,
      validated.body.newPassword
    );

    ApiResponse.success(res, result);
  });

  /**
   * Refresh token
   * POST /auth/token/refresh
   */
  refreshToken = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const refreshToken =
        req.body?.refreshToken ||
        req.cookies[COOKIE_CONFIG.REFRESH_TOKEN.name];
      if (!refreshToken) { 
        throw new UnauthorizedException("Refresh token not found");
      }

      const result = await this.authService.refreshAccessToken(refreshToken);

      ApiResponse.success(res, result);
    }
  );

  // ============================================
  // LOGOUT (UPDATED - Clear Cookie)
  // ============================================

  /**
   * Logout endpoint
   * POST /auth/logout
   */

  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }
    // const token = req.headers.authorization?.replace("Bearer ", "") || "";

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException("No authorization header provided");
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new UnauthorizedException("Invalid authorization header format");
    }

    const token = parts[1];

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    const result = await this.authService.logout(token, userId);

    res.clearCookie(COOKIE_CONFIG.REFRESH_TOKEN.name, {
      httpOnly: true,
      secure: COOKIE_CONFIG.REFRESH_TOKEN.options.secure,
      sameSite: COOKIE_CONFIG.REFRESH_TOKEN.options.sameSite,
      path: "/",
    });

    ApiResponse.success(res, result, MESSAGES.AUTH.LOGOUT_SUCCESS);
  });

  /**
   * Change password for authenticated user
   * PUT /api/v1/auth/change-password
   * Protected: All authenticated users (Admin, Cleaner, Client)
   * Unified: Single endpoint for all user types
   * Works for all roles without role-specific logic
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(changePasswordSchema, req);
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const result = await this.authService.changePassword(
      userId,
      validated.body.currentPassword,
      validated.body.newPassword
    );

    ApiResponse.success(res, result, "Password changed successfully");
  });

  /**
   * Google login/signup
   * POST /auth/google
   */
  googleAuth = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(googleAuthSchema, req);
    const result = await this.authService.loginWithGoogle(validated.body);

    res.cookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      result.tokens.refreshToken,
      COOKIE_CONFIG.REFRESH_TOKEN.options
    );

    const response: AuthControllerResponse = {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    };

    ApiResponse.success(res, response, MESSAGES.AUTH.LOGIN_SUCCESS);
  });
}
