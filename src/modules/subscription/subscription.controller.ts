import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  confirmSubscriptionPaymentSchema,
  createSubscriptionCheckoutIntentSchema,
} from "./subscription.schema";
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

  getSubscriptionFees = asyncHandler(async (_req: Request, res: Response) => {
    const fees = await this.service.getSubscriptionFees();
    ApiResponse.success(res, fees, "Subscription fees fetched successfully");
  });

  createCheckoutIntent = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createSubscriptionCheckoutIntentSchema, req);
    const userId = req.user?.userId as string;
    const intent = await this.service.createCheckoutIntent(userId, validated.body);
    ApiResponse.success(res, intent, "Subscription checkout intent created");
  });

  confirmPayment = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(confirmSubscriptionPaymentSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.confirmPayment(
      userId,
      validated.body.paymentIntentId,
    );
    ApiResponse.success(res, result, "Subscription activated successfully");
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const subscription = await this.service.cancel(userId);
    ApiResponse.success(res, subscription, "Subscription cancelled successfully");
  });
}
