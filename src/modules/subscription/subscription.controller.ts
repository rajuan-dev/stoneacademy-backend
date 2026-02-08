import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { activateSubscriptionSchema } from "./subscription.schema";
import { SubscriptionService } from "./subscription.service";

export class SubscriptionController {
  private service: SubscriptionService;

  constructor() {
    this.service = new SubscriptionService();
  }

  getMySubscription = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const subscription = await this.service.getMySubscription(userId);
    ApiResponse.success(
      res,
      subscription,
      "Subscription fetched successfully",
    );
  });

  activate = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activateSubscriptionSchema, req);
    const userId = req.user?.userId as string;
    const subscription = await this.service.activate(userId, validated.body);
    ApiResponse.created(res, subscription, "Subscription activated successfully");
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const subscription = await this.service.cancel(userId);
    ApiResponse.success(res, subscription, "Subscription cancelled successfully");
  });
}
