import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { SettingsService } from "./settings.service";
import { updatePlatformSettingsSchema } from "./settings.schema";

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
}
