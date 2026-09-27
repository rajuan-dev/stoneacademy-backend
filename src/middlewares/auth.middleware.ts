// file: src/middlewares/auth.middleware.ts

import type { NextFunction, Request, Response } from "express";

import { MESSAGES, USER_STATUS } from "@/constants/app.constants";
import { ErrorCodeEnum } from "@/enums/error-code.enum";
import { logger } from "@/middlewares/pino-logger";
import { AdminAccount } from "@/modules/admin-account/admin-account.model";
import { AuthUtil } from "@/modules/auth/auth.utils";
import { User } from "@/modules/user/user.model";
import {
  ForbiddenException,
  UnauthorizedException,
} from "@/utils/app-error.utils";

/**
 * Extended Express Request with user info
 */
/* eslint-disable ts/consistent-type-definitions, ts/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        status?: string;
        accountStatus?: string;
        emailVerified?: boolean;
        emailVerifiedAt?: string | null;
        subjectType?: "user" | "admin";
        iat?: number;
        exp?: number;
      };
      requestId?: string;
    }
  }
}
/* eslint-enable ts/consistent-type-definitions, ts/no-namespace */

export class AuthMiddleware {
  static verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.get("Authorization") || req.get("authorization");
      const requestId = req.id || req.headers["x-request-id"];

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.warn(
          { requestId, path: req.path },
          "Missing or invalid Authorization header",
        );
        throw new UnauthorizedException(
          MESSAGES.AUTH.INVALID_CREDENTIALS,
          ErrorCodeEnum.AUTH_TOKEN_NOT_FOUND,
        );
      }

      const token = authHeader.substring(7);

      const payload = AuthUtil.verifyAccessToken(token);

      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        status: payload.status,
        accountStatus: payload.accountStatus,
        emailVerified: payload.emailVerified,
        emailVerifiedAt: payload.emailVerifiedAt,
        subjectType: payload.subjectType === "admin" ? "admin" : "user",
        iat: payload.iat,
        exp: payload.exp,
      };

      if (req.user.status === USER_STATUS.BLOCKED) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_SUSPENDED);
      }
      if (req.user.status === USER_STATUS.DELETED) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
      }

      const account = await AuthMiddleware.getCurrentAccountStatus(
        req.user.userId,
        req.user.subjectType,
      );

      if (!account) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
      }

      req.user.status = account.status;
      req.user.accountStatus = account.accountStatus;

      if (account.status === USER_STATUS.BLOCKED) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_SUSPENDED);
      }
      if (account.status === USER_STATUS.DELETED) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
      }

      next();
    }
    catch (error) {
      logger.warn(
        { requestId: req.id, error: (error as any).message },
        "Token verification failed",
      );
      next(error);
    }
  };

  private static async getCurrentAccountStatus(
    userId: string,
    subjectType: "user" | "admin" = "user",
  ) {
    const account = subjectType === "admin"
      ? await AdminAccount.findById(userId)
          .select("status accountStatus isDeleted")
          .lean()
      : await User.findById(userId)
          .select("status accountStatus isDeleted")
          .lean();

    if (!account || (account as any).isDeleted) return null;

    return {
      status: account.status,
      accountStatus: account.accountStatus,
    };
  }

  static authorize = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new UnauthorizedException(
            MESSAGES.AUTH.UNAUTHORIZED_ACCESS,
            ErrorCodeEnum.AUTH_UNAUTHORIZED_ACCESS,
          );
        }

        if (!allowedRoles.includes(req.user.role)) {
          logger.warn(
            { userId: req.user.userId, role: req.user.role, requestId: req.id },
            "User role not authorized",
          );
          throw new ForbiddenException(
            `Only ${allowedRoles.join(", ")} can access this resource`,
            ErrorCodeEnum.ACCESS_UNAUTHORIZED,
          );
        }

        next();
      }
      catch (error) {
        next(error);
      }
    };
  };

  static optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.get("Authorization") || req.get("authorization");

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const payload = AuthUtil.verifyAccessToken(token);

        req.user = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          status: payload.status,
          accountStatus: payload.accountStatus,
          emailVerified: payload.emailVerified,
          emailVerifiedAt: payload.emailVerifiedAt,
          subjectType: payload.subjectType === "admin" ? "admin" : "user",
          iat: payload.iat,
          exp: payload.exp,
        };

        logger.debug({ userId: payload.userId }, "Optional token verified");
      }

      next();
    }
    catch (error) {
      logger.debug(
        { error: (error as any).message },
        "Optional token verification skipped",
      );
      next();
    }
  };

  static checkTokenExpiration = (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user || !req.user.exp) {
        return next();
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = req.user.exp - now;

      if (expiresIn < 300 && expiresIn > 0) {
        logger.warn(
          { userId: req.user.userId, expiresIn },
          "Token expiring soon",
        );
        res.setHeader("X-Token-Expires-In", expiresIn);
      }

      next();
    }
    catch (error) {
      next(error);
    }
  };

  static verifyEmailVerified = (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user?.emailVerified) {
        if (!req.user?.emailVerifiedAt) {
          throw new ForbiddenException(
            "Please verify your email address before accessing this resource.",
            ErrorCodeEnum.ACCESS_UNAUTHORIZED,
          );
        }
      }

      next();
    }
    catch (error) {
      next(error);
    }
  };
}

export const authMiddleware = {
  verifyToken: AuthMiddleware.verifyToken,
  authorize: AuthMiddleware.authorize,
  optionalAuth: AuthMiddleware.optionalAuth,
  checkTokenExpiration: AuthMiddleware.checkTokenExpiration,
  verifyEmailVerified: AuthMiddleware.verifyEmailVerified,
};
