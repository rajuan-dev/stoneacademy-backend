import type { Request, Response } from "express";

import { Router } from "express";

import { ROLES } from "@/constants/app.constants";
import { env } from "@/env";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { stripeService } from "@/services/stripe.service";
import { BadRequestException } from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";

import {
  createPayoutRequestSchema,
  createSelfWithdrawalSchema,
  listBillingSchema,
  payoutRequestIdSchema,
  updatePayoutStatusSchema,
} from "./billing.schema";
import { BillingService } from "./billing.service";

const service = new BillingService();
export const billingRouter = Router();

billingRouter.get(
  "/transactions/me",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listBillingSchema, req);
    const userId = req.user?.userId as string;
    const result = await service.listMyTransactions(userId, validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Transactions fetched successfully",
    );
  }),
);

billingRouter.get(
  "/earnings/me",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const summary = await service.creatorEarningsSummary(userId);
    ApiResponse.success(res, summary, "Earnings fetched successfully");
  }),
);

billingRouter.post(
  "/payouts/withdraw",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createSelfWithdrawalSchema, req);
    const userId = req.user?.userId as string;
    const payout = await service.createSelfWithdrawal(userId, validated.body);
    ApiResponse.created(res, payout, "Withdrawal processed successfully");
  }),
);

billingRouter.post(
  "/payouts/request",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createPayoutRequestSchema, req);
    const userId = req.user?.userId as string;
    const payout = await service.createPayoutRequest(userId, validated.body);
    ApiResponse.created(res, payout, "Payout request submitted successfully");
  }),
);

billingRouter.get(
  "/payouts/me",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listBillingSchema, req);
    const userId = req.user?.userId as string;
    const result = await service.listMyPayouts(userId, validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Payout requests fetched successfully",
    );
  }),
);

billingRouter.get(
  "/admin/transactions",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listBillingSchema, req);
    const result = await service.listAdminTransactions(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Transactions fetched successfully",
    );
  }),
);

billingRouter.get(
  "/admin/payouts",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listBillingSchema, req);
    const result = await service.listAdminPayouts(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Payouts fetched successfully",
    );
  }),
);

billingRouter.patch(
  "/admin/payouts/:id/status",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updatePayoutStatusSchema, req);
    const adminId = req.user?.userId as string;
    const payout = await service.updatePayoutStatus(
      validated.params.id,
      adminId,
      validated.body,
    );
    ApiResponse.success(res, payout, "Payout status updated successfully");
  }),
);

billingRouter.post(
  "/events/:eventId/checkout-intent",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = req.params.eventId;
    const userId = req.user?.userId as string;

    const transaction = await service.createOrGetPendingTransactionForEvent({
      eventId,
      payerId: userId,
    });
    if (!env.STRIPE_SECRET_KEY) {
      return ApiResponse.success(
        res,
        {
          paymentIntentClientSecret: null,
          transaction,
          provider: "stripe_not_configured",
        },
        "Stripe is not configured. Pending transaction was created.",
      );
    }

    if (transaction.provider === "stripe" && transaction.providerReference) {
      const existingIntent = await stripeService.retrievePaymentIntent(
        transaction.providerReference,
      );

      if (existingIntent.status === "succeeded") {
        await service.markTransactionSucceededByProviderRef(existingIntent.id, "stripe");
        throw new BadRequestException("This event ticket is already paid.");
      }

      if (
        ["requires_payment_method", "requires_confirmation", "requires_action", "processing"]
          .includes(existingIntent.status)
      ) {
        return ApiResponse.success(
          res,
          {
            paymentIntentClientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
            transaction,
          },
          "Existing checkout intent returned successfully",
        );
      }
    }

    const intent = await service.createEventPaymentIntentForTransaction(
      transaction._id.toString(),
    );

    ApiResponse.success(
      res,
      {
        paymentIntentClientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        transaction,
      },
      "Checkout intent created successfully",
    );
  }),
);
