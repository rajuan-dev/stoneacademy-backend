import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  createOnboardingLinkSchema,
  createStripeAccountSchema,
} from "./host-stripe.schema";
import { HostStripeService } from "./host-stripe.service";

export class HostStripeController {
  private service: HostStripeService;

  constructor() {
    this.service = new HostStripeService();
  }

  createStripeAccount = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createStripeAccountSchema, req);
    const hostId = req.user?.userId as string;

    const result = await this.service.createConnectedAccountForHost(
      hostId,
      validated.body,
    );

    ApiResponse.success(res, result, "Stripe connected account ready");
  });

  createOnboardingLink = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createOnboardingLinkSchema, req);
    const hostId = req.user?.userId as string;

    const result = await this.service.createOnboardingLinkForHost(
      hostId,
      validated.body,
    );

    ApiResponse.success(res, result, "Stripe onboarding link created");
  });

  syncOnboardingStatus = asyncHandler(async (req: Request, res: Response) => {
    const hostId = req.user?.userId as string;
    const result = await this.service.syncOnboardingStatusForHost(hostId);
    ApiResponse.success(res, result, "Stripe onboarding status synced");
  });
}
