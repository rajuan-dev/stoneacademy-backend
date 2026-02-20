import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { SettingsService } from "./settings.service";
import {
  updatePlatformSettingsSchema,
  updateSettingsProfileSchema,
  updateSettingsSecuritySchema,
} from "./settings.schema";

export class SettingsController {
  private service: SettingsService;

  constructor() {
    this.service = new SettingsService();
  }

  getPlatformSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await this.service.getPlatformSettings();
    ApiResponse.success(res, settings, "Platform settings fetched");
  });

  updatePlatformSettings = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updatePlatformSettingsSchema, req);
    const adminId = req.user?.userId as string;
    const settings = await this.service.updatePlatformSettings(
      validated.body,
      adminId,
    );
    ApiResponse.success(res, settings, "Platform settings updated");
  });

  getProfileSettings = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.userId as string;
    const profile = await this.service.getAdminSettingsProfile(adminId);
    ApiResponse.success(res, profile, "Profile settings fetched");
  });

  updateProfileSettings = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateSettingsProfileSchema, req);
    const adminId = req.user?.userId as string;
    const profile = await this.service.updateAdminSettingsProfile(
      adminId,
      validated.body,
    );
    ApiResponse.success(res, profile, "Profile settings updated");
  });

  getSecuritySettings = asyncHandler(async (_req: Request, res: Response) => {
    const security = await this.service.getAdminSettingsSecurity();
    ApiResponse.success(res, security, "Security settings fetched");
  });

  updateSecuritySettings = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateSettingsSecuritySchema, req);
    const adminId = req.user?.userId as string;
    const result = await this.service.updateAdminSettingsSecurity(
      adminId,
      validated.body,
    );
    ApiResponse.success(res, result, "Security settings updated");
  });
}
