import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import type { Request, Response } from "express";
import { OnboardingService } from "./onboarding.service";

export class OnboardingController {
  private service: OnboardingService;

  constructor() {
    this.service = new OnboardingService();
  }

  slides = asyncHandler(async (_req: Request, res: Response) => {
    const slides = this.service.getSlides();
    ApiResponse.success(res, slides, "Onboarding slides fetched");
  });

  status = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const status = await this.service.getStatus(userId);
    ApiResponse.success(res, status, "Onboarding status fetched");
  });

  complete = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const status = await this.service.markCompleted(userId);
    ApiResponse.success(res, status, "Onboarding completed");
  });

  skip = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const status = await this.service.markSkipped(userId);
    ApiResponse.success(res, status, "Onboarding skipped");
  });
}
