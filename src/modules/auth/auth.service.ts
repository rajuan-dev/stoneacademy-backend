// file: src/modules/auth/auth.service.ts

import {
  AUTH,
  MESSAGES,
  OTP_PURPOSES,
  ROLES,
  USER_STATUS,
} from "@/constants/app.constants";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { EmailService } from "@/services/email.service";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import { comparePassword, hashPassword } from "@/utils/password.utils";
import { OAuth2Client } from "google-auth-library";
import { adminNotificationService } from "@/modules/admin-notification/admin-notification.service";
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
import { PendingRegistration } from "./pending-registration.model";
import { AuthUtil } from "./auth.utils";

export class AuthService {
  private userService: UserService;
  private emailService: EmailService;
  private googleClient?: OAuth2Client;

  constructor() {
    this.userService = new UserService();
    this.emailService = new EmailService();
    if (env.GOOGLE_CLIENT_ID) {
      this.googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    }
  }

  async login(payload: LoginPayload): Promise<AuthServiceResponse> {
    const user = await this.userService.getUserByEmailWithPassword(
      payload.email,
    );

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
      throw new UnauthorizedException("Account temporarily locked. Please try again later.");
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
      await this.userService.recordFailedLogin(
        user._id.toString(),
        AUTH.MAX_LOGIN_ATTEMPTS,
        AUTH.LOGIN_LOCKOUT_MINUTES,
      );
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    await this.userService.updateLastLogin(user._id.toString());
    await this.userService.resetLoginAttempts(user._id.toString());

    const tokens = this.generateTokens(user);

    return {
      user: this.userService.toUserResponse(user),
      tokens,
    };
  }

  async adminLogin(payload: LoginPayload): Promise<AuthServiceResponse> {
    const result = await this.login(payload);
    const role = result.user.role;
    if (role !== ROLES.ADMIN && role !== ROLES.SUPER_ADMIN) {
      throw new UnauthorizedException("Only admin can login from this endpoint");
    }
    return result;
  }

  async loginWithGoogle(payload: {
    idToken: string;
    fullName?: string;
  }): Promise<AuthServiceResponse> {
    if (!env.GOOGLE_CLIENT_ID || !this.googleClient) {
      throw new BadRequestException("Google auth is not configured");
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const googlePayload = ticket.getPayload();
    if (!googlePayload?.email) {
      throw new UnauthorizedException("Invalid Google token");
    }

    if (!googlePayload.email_verified) {
      throw new UnauthorizedException("Google email not verified");
    }

    let user = await this.userService.getUserByEmail(googlePayload.email);

    if (!user) {
      const fullName = payload.fullName || googlePayload.name || "Google User";
      user = await this.userService.createUser({
        email: googlePayload.email,
        fullName,
        role: ROLES.USER,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
      });
    } else {
      if (user.status === USER_STATUS.SUSPENDED) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_SUSPENDED);
      }
      if (user.status === USER_STATUS.DELETED) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
      }
      if (!user.emailVerified) {
        user.emailVerified = true;
        user.emailVerifiedAt = new Date();
      }
      if (!user.profileImageUrl && googlePayload.picture) {
        user.profileImageUrl = googlePayload.picture;
      }
      await user.save();
    }

    await this.userService.updateLastLogin(user._id.toString());
    const tokens = this.generateTokens(user);

    return {
      user: this.userService.toUserResponse(user),
      tokens,
    };
  }

  async register(payload: RegisterPayload): Promise<{
    email: string;
    verification: { expiresAt: Date; expiresInMinutes: number };
  }> {
    if (payload.role && payload.role !== ROLES.USER) {
      throw new BadRequestException("Only users can self-register");
    }

    const email = payload.email.toLowerCase();
    const existingUser = await this.userService.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    const passwordHash = await hashPassword(payload.password);

    const otp = await otpService.sendOtp({
      email,
      purpose: OTP_PURPOSES.VERIFY_EMAIL,
      meta: payload.meta,
    });

    await this.sendEmailVerificationOrThrow({
      to: email,
      userName: payload.fullName,
      userType: ROLES.USER,
      verificationCode: otp.code,
      expiresIn: String(otp.expiresInMinutes),
    });

    await PendingRegistration.findOneAndUpdate(
      { email },
      {
        email,
        fullName: payload.fullName,
        passwordHash,
        role: ROLES.USER,
        expiresAt: otp.expiresAt,
        meta: payload.meta,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    ).exec();

    return {
      email,
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
    const pendingRegistration = payload.purpose === OTP_PURPOSES.VERIFY_EMAIL
      ? await PendingRegistration.findOne({
          email: payload.email.toLowerCase(),
          expiresAt: { $gt: new Date() },
        }).exec()
      : null;

    if (
      !user
      && !pendingRegistration
      && payload.purpose !== OTP_PURPOSES.LOGIN_OTP_OPTIONAL
    ) {
      return {
        expiresAt: new Date(),
        expiresInMinutes: AUTH.OTP_EXPIRY_MINUTES,
      };
    }

    if (payload.purpose === OTP_PURPOSES.VERIFY_EMAIL) {
      if (user?.emailVerifiedAt) {
        throw new BadRequestException(MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED);
      }
    }

    const otp = await otpService.sendOtp({
      email: payload.email,
      purpose: payload.purpose,
      meta: payload.meta,
    });

    if (payload.purpose === OTP_PURPOSES.RESET_PASSWORD) {
      await this.sendPasswordResetOtpOrThrow(
        user?.fullName,
        payload.email,
        otp.code,
        otp.expiresInMinutes,
      );
    } else {
      await this.sendEmailVerificationOrThrow({
        to: payload.email,
        userName: user?.fullName || pendingRegistration?.fullName || "there",
        userType: user?.role || pendingRegistration?.role || ROLES.USER,
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
      if (user) {
        user.emailVerified = true;
        user.emailVerifiedAt = new Date();
        user.status = USER_STATUS.ACTIVE;
        await user.save();
      } else {
        const pending = await PendingRegistration.findOne({
          email: payload.email.toLowerCase(),
          expiresAt: { $gt: new Date() },
        })
          .select("+passwordHash")
          .exec();

        if (!pending) {
          throw new BadRequestException(
            "No pending registration found. Please register again.",
          );
        }

        const createdUser = await this.userService.createUserWithHashedPassword({
          email: pending.email,
          passwordHash: pending.passwordHash,
          fullName: pending.fullName,
          role: pending.role,
          status: USER_STATUS.ACTIVE,
          emailVerifiedAt: new Date(),
        });

        await PendingRegistration.deleteOne({ _id: pending._id }).exec();

        await adminNotificationService.create({
          type: "new_user",
          title: "New user registered",
          body: `${createdUser.fullName} just registered.`,
          payload: {
            userId: createdUser._id.toString(),
            email: createdUser.email,
          },
        });
      }
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

    await this.sendPasswordResetOtpOrThrow(
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
    await this.userService.invalidateAllRefreshTokensForUser(user._id.toString());

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

      if (await this.userService.isRefreshTokenBlacklisted(refreshToken)) {
        throw new UnauthorizedException(MESSAGES.AUTH.REFRESH_TOKEN_INVALID);
      }

      if (
        user.refreshTokenInvalidBefore &&
        payload.iat &&
        payload.iat * 1000 < user.refreshTokenInvalidBefore.getTime()
      ) {
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

      const payload = AuthUtil.verifyRefreshToken(token);
      const expiresAt = payload.exp
        ? new Date(payload.exp * 1000)
        : AuthUtil.getTokenExpirationTime(AUTH.REFRESH_TOKEN_EXPIRY);

      await this.userService.addRefreshTokenToBlacklist(
        userId,
        token,
        expiresAt,
        "logout",
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
    await this.userService.invalidateAllRefreshTokensForUser(userId);

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

  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.userService.invalidateAllRefreshTokensForUser(userId);
    return { message: "All sessions logged out successfully" };
  }

  private async sendEmailVerificationOrThrow(payload: {
    to: string;
    userName: string;
    userType: string;
    verificationCode: string;
    expiresIn: string;
  }): Promise<void> {
    try {
      await this.emailService.sendEmailVerification(payload);
    } catch (error) {
      this.throwEmailDeliveryError(error, payload.to);
    }
  }

  private async sendPasswordResetOtpOrThrow(
    userName: string | undefined,
    to: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    try {
      await this.emailService.sendPasswordResetOTP(
        userName,
        to,
        code,
        expiresInMinutes,
      );
    } catch (error) {
      this.throwEmailDeliveryError(error, to);
    }
  }

  private throwEmailDeliveryError(error: unknown, to: string): never {
    const reason = error instanceof Error ? error.message : "Unknown error";
    logger.warn(
      {
        to,
        error,
      },
      "Email delivery failed",
    );

    throw new BadRequestException(
      `Unable to send verification email. ${reason}`,
    );
  }
}
