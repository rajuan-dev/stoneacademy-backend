// file: src/modules/auth/auth.service.ts

import {
  AUTH,
  MESSAGES,
  OTP_PURPOSES,
  ROLES,
  USER_STATUS,
} from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import { EmailService } from "@/services/email.service";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import { comparePassword, hashPassword } from "@/utils/password.utils";
import { otpService } from "../otp/otp.service";
import type { IUser } from "../user/user.interface";
import { UserService } from "../user/user.service";
import type { UserResponse } from "../user/user.type";
import type {
  AuthServiceResponse,
  LoginPayload,
  RegisterPayload,
  SendOtpPayload,
  VerifyOtpPayload,
} from "./auth.type";
import { AuthUtil } from "./auth.utils";

export class AuthService {
  private userService: UserService;
  private emailService: EmailService;

  constructor() {
    this.userService = new UserService();
    this.emailService = new EmailService();
  }

  async login(payload: LoginPayload): Promise<AuthServiceResponse> {
    const user = await this.userService.getUserByEmailWithPassword(
      payload.email,
    );

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    if (!user.emailVerifiedAt && !user.emailVerified) {
      throw new UnauthorizedException("NEEDS_OTP_VERIFY");
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_SUSPENDED);
    }

    if (user.status === USER_STATUS.DELETED) {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await comparePassword(
      payload.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    await this.userService.updateLastLogin(user._id.toString());

    const tokens = this.generateTokens(user);

    return {
      user: this.userService.toUserResponse(user),
      tokens,
    };
  }

  async register(payload: RegisterPayload): Promise<{
    user: UserResponse;
    verification: { expiresAt: Date; expiresInMinutes: number };
  }> {
    if (payload.role && payload.role !== ROLES.USER) {
      throw new BadRequestException("Only users can self-register");
    }

    const user = await this.userService.createUser({
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
      role: ROLES.USER,
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: null,
    });

    const otp = await otpService.sendOtp({
      email: user.email,
      purpose: OTP_PURPOSES.VERIFY_EMAIL,
      meta: payload.meta,
    });

    await this.emailService.sendEmailVerification({
      to: user.email,
      userName: user.fullName,
      userType: user.role,
      verificationCode: otp.code,
      expiresIn: String(otp.expiresInMinutes),
    });

    return {
      user: this.userService.toUserResponse(user),
      verification: {
        expiresAt: otp.expiresAt,
        expiresInMinutes: otp.expiresInMinutes,
      },
    };
  }

  async sendOtp(payload: SendOtpPayload): Promise<{
    expiresAt: Date;
    expiresInMinutes: number;
  }> {
    const user = await this.userService.getUserByEmail(payload.email);
    if (!user && payload.purpose !== OTP_PURPOSES.LOGIN_OTP_OPTIONAL) {
      return {
        expiresAt: new Date(),
        expiresInMinutes: AUTH.OTP_EXPIRY_MINUTES,
      };
    }

    if (payload.purpose === OTP_PURPOSES.VERIFY_EMAIL) {
      if (!user) {
        throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
      }
      if (user.emailVerifiedAt) {
        throw new BadRequestException(MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED);
      }
    }

    const otp = await otpService.sendOtp({
      email: payload.email,
      purpose: payload.purpose,
      meta: payload.meta,
    });

    if (payload.purpose === OTP_PURPOSES.RESET_PASSWORD) {
      await this.emailService.sendPasswordResetOTP(
        user?.fullName,
        payload.email,
        otp.code,
        otp.expiresInMinutes,
      );
    } else {
      await this.emailService.sendEmailVerification({
        to: payload.email,
        userName: user?.fullName || "there",
        userType: user?.role || ROLES.USER,
        verificationCode: otp.code,
        expiresIn: String(otp.expiresInMinutes),
      });
    }

    return {
      expiresAt: otp.expiresAt,
      expiresInMinutes: otp.expiresInMinutes,
    };
  }

  async verifyOtp(payload: VerifyOtpPayload): Promise<{ message: string }> {
    const record = await otpService.verifyOtp({
      email: payload.email,
      purpose: payload.purpose,
      code: payload.code,
    });

    if (payload.purpose === OTP_PURPOSES.VERIFY_EMAIL) {
      const user = await this.userService.getUserByEmail(payload.email);
      if (!user) {
        throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
      }
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      user.status = USER_STATUS.ACTIVE;
      await user.save();
    }

    logger.info(
      { email: payload.email, purpose: record.purpose },
      "OTP verified",
    );

    return { message: "OTP verified successfully" };
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ message: string; expiresAt?: Date; expiresInMinutes?: number }> {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      return { message: MESSAGES.AUTH.PASSWORD_RESET_OTP_SENT };
    }

    const otp = await otpService.sendOtp({
      email: user.email,
      purpose: OTP_PURPOSES.RESET_PASSWORD,
    });

    await this.emailService.sendPasswordResetOTP(
      user.fullName,
      user.email,
      otp.code,
      otp.expiresInMinutes,
    );

    return {
      message: MESSAGES.AUTH.PASSWORD_RESET_OTP_SENT,
      expiresAt: otp.expiresAt,
      expiresInMinutes: otp.expiresInMinutes,
    };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    await otpService.verifyOtp({
      email,
      purpose: OTP_PURPOSES.RESET_PASSWORD,
      code,
    });

    const hashedPassword = await hashPassword(newPassword);

    await this.userService.updatePassword(user._id.toString(), hashedPassword);

    await this.emailService.sendPasswordResetConfirmation(
      user.fullName,
      user.email,
    );

    logger.info(
      { userId: user._id, email },
      "Password reset successfully completed",
    );

    return {
      message:
        "Password reset successfully. Please log in with your new password.",
    };
  }

  async verifyPasswordOTP(
    email: string,
    code: string,
  ): Promise<{ message: string }> {
    await otpService.verifyOtp({
      email,
      purpose: OTP_PURPOSES.RESET_PASSWORD,
      code,
    });
    return { message: "OTP verified successfully" };
  }

  async resendPasswordOTP(
    email: string,
  ): Promise<{ message: string; expiresAt?: Date; expiresInMinutes?: number }> {
    return this.requestPasswordReset(email);
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    try {
      const payload = AuthUtil.verifyRefreshToken(refreshToken);

      const user = await this.userService.getById(payload.userId);

      if (!user) {
        throw new UnauthorizedException(MESSAGES.AUTH.REFRESH_TOKEN_INVALID);
      }

      if (!user.emailVerifiedAt && !user.emailVerified) {
        throw new UnauthorizedException(MESSAGES.AUTH.EMAIL_NOT_VERIFIED);
      }

      if (user.status === USER_STATUS.SUSPENDED) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_SUSPENDED);
      }

      if (user.status === USER_STATUS.DELETED) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
      }

      const accessToken = AuthUtil.generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        status: user.status,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt
          ? user.emailVerifiedAt.toISOString()
          : null,
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException(MESSAGES.AUTH.REFRESH_TOKEN_INVALID);
    }
  }

  private generateTokens(user: IUser): {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  } {
    const accessToken = AuthUtil.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt
        ? user.emailVerifiedAt.toISOString()
        : null,
    });

    const refreshToken = AuthUtil.generateRefreshToken(user._id.toString());

    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH.ACCESS_TOKEN_EXPIRY,
    };
  }

  async logout(token: string, userId: string): Promise<{ message: string }> {
    try {
      logger.info(
        { userId, token: token.substring(0, 20) + "..." },
        "User logged out",
      );

      return { message: "Logged out successfully" };
    } catch (error) {
      logger.error({ error, userId }, "Logout failed");
      throw new BadRequestException("Logout failed");
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userService.getUserByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    const isPasswordValid = await comparePassword(
      currentPassword,
      user.passwordHash!,
    );

    if (!isPasswordValid) {
      logger.warn(
        { userId },
        "Invalid current password attempt for password change",
      );
      throw new UnauthorizedException("Current password is incorrect");
    }

    const hashedPassword = await hashPassword(newPassword);
    await this.userService.updatePassword(userId, hashedPassword);
    await this.userService.invalidateAllRefreshTokens(userId);

    await this.userService.notifyPasswordChange(
      user.email,
      user.fullName,
      new Date(),
    );

    logger.info({ userId, email: user.email }, "Password changed successfully");

    return {
      message:
        "Password changed successfully. Please login again with your new password.",
    };
  }
}
