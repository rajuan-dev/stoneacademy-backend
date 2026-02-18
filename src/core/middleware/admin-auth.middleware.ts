// file: src/core/middleware/admin-auth.middleware.ts

import { MESSAGES, ROLES } from "@/constants/app.constants";
import type { NextFunction, Request, Response } from "express";
import {
  ForbiddenException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import { authMiddleware } from "@/middlewares/auth.middleware";

type Role = (typeof ROLES)[keyof typeof ROLES];

function verifyAdminContext(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(
      new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS),
    );
  }

  if (req.user.subjectType !== "admin") {
    return next(
      new ForbiddenException(
        "Admin credentials are required for this resource",
      ),
    );
  }

  return next();
}

const verifyToken: (
  req: Request,
  res: Response,
  next: NextFunction,
) => void = authMiddleware.verifyToken;

function verifyAdmin(req: Request, res: Response, next: NextFunction) {
  verifyToken(req, res, (error?: any) => {
    if (error) {
      return next(error);
    }
    return verifyAdminContext(req, res, next);
  });
}

export function adminRequireRoles(...roles: Role[]) {
  const normalized = roles.length ? roles : [ROLES.ADMIN, ROLES.SUPER_ADMIN];
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS),
      );
    }
    if (!normalized.includes(req.user.role as Role)) {
      return next(
        new ForbiddenException(
          `Only ${normalized.join(", ")} can access this resource`,
        ),
      );
    }
    return next();
  };
}

export const adminAuthMiddleware = {
  verifyAdmin,
  requireRoles: adminRequireRoles,
};

