// file: src/core/middleware/rbac.middleware.ts

import type { NextFunction, Request, Response } from "express";
import { MESSAGES } from "@/constants/app.constants";
import {
  ForbiddenException,
  UnauthorizedException,
} from "@/utils/app-error.utils";

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS),
      );
    }

    if (!roles.length) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenException(
          `Only ${roles.join(", ")} can access this resource`,
        ),
      );
    }

    return next();
  };
}

