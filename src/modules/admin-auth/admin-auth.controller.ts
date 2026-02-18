// file: src/modules/admin-auth/admin-auth.controller.ts

import { COOKIE_CONFIG } from "@/config/cookie.config";
import upload from "@/config/multer.config";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { adminAuthMiddleware } from "@/core/middleware/admin-auth.middleware";
import { ApiResponse } from "@/core/http/api-response";
import { zParse } from "@/utils/validators.utils";
import type { Router } from "express";
import { AdminAuthService } from "./admin-auth.service";
import {
  adminChangePasswordSchema,
  adminLoginSchema,
  adminLogoutSchema,
  adminProfileUpdateSchema,
} from "./admin-auth.schema";

export class AdminAuthController {
  private service: AdminAuthService;

  constructor() {
    this.service = new AdminAuthService();
  }

  registerRoutes(router: Router) {
    router.post("/login", this.login);
    router.post("/logout", adminAuthMiddleware.verifyAdmin, this.logout);
    router.post("/logout-all", adminAuthMiddleware.verifyAdmin, this.logoutAll);
    router.get("/profile", adminAuthMiddleware.verifyAdmin, this.getProfile);
    router.put(
      "/profile",
      adminAuthMiddleware.verifyAdmin,
      upload.single("photo"),
      this.updateProfile,
    );
    router.put(
      "/password",
      adminAuthMiddleware.verifyAdmin,
      this.changePassword,
    );
  }

  login = asyncHandler(async (req, res) => {
    const validated = await zParse(adminLoginSchema, req);
    const result = await this.service.login(validated.body);
    ApiResponse.success(res, result, "Admin login successful");
  });

  logout = asyncHandler(async (req, res) => {
    const validated = await zParse(adminLogoutSchema, req);
    const adminId = req.user?.userId as string;
    const refreshToken =
      validated.body?.refreshToken
      || (req.cookies?.[COOKIE_CONFIG.REFRESH_TOKEN.name] as string | undefined);
    const result = await this.service.logout(adminId, refreshToken);
    ApiResponse.success(res, result, "Admin logged out successfully");
  });

  logoutAll = asyncHandler(async (req, res) => {
    const adminId = req.user?.userId as string;
    const result = await this.service.logoutAll(adminId);
    ApiResponse.success(res, result, "Admin sessions revoked");
  });

  getProfile = asyncHandler(async (req, res) => {
    const adminId = req.user?.userId as string;
    const profile = await this.service.getProfile(adminId);
    ApiResponse.success(res, profile, "Admin profile fetched");
  });

  updateProfile = asyncHandler(async (req, res) => {
    const validated = await zParse(adminProfileUpdateSchema, req);
    const adminId = req.user?.userId as string;
    const profile = await this.service.updateProfile(
      adminId,
      validated.body,
      req.file,
    );
    ApiResponse.success(res, profile, "Admin profile updated");
  });

  changePassword = asyncHandler(async (req, res) => {
    const validated = await zParse(adminChangePasswordSchema, req);
    const adminId = req.user?.userId as string;
    const result = await this.service.changePassword(
      adminId,
      validated.body.currentPassword,
      validated.body.newPassword,
    );
    ApiResponse.success(res, result, "Admin password changed");
  });
}
