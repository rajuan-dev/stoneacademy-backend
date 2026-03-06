import { ROLES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { stripeService } from "@/services/stripe.service";
import { Event } from "@/modules/event/event.model";
import { User } from "@/modules/user/user.model";
import { BadRequestException, NotFoundException } from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import { Router, type Request, type Response } from "express";
import { env } from "@/env";
import {
  createPayoutRequestSchema,
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
    const event = await Event.findById(eventId).select("creatorId").lean();
    if (!event?.creatorId) {
      throw new NotFoundException("Event host not found");
    }

    const host = await User.findById(event.creatorId)
      .select("stripeAccountId stripeOnboardingCompleted")
      .lean();

    if (!host?.stripeAccountId || !host?.stripeOnboardingCompleted) {
      throw new BadRequestException(
        "Host Stripe onboarding is incomplete. Ticket payment is not available yet.",
      );
    }

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

    // Stripe Connect destination charge:
    // - platform keeps `application_fee_amount` (10%)
    // - remaining amount is transferred to host connected account (90%)
    const intent = await stripeService.createPaymentIntent({
      amount: Math.round(transaction.grossAmount * 100),
      currency: (transaction.currency || "usd").toLowerCase(),
      application_fee_amount: Math.round(transaction.platformFeeAmount * 100),
      transfer_data: {
        destination: host.stripeAccountId,
      },
      metadata: {
        paymentType: "event_ticket",
        transactionId: transaction._id.toString(),
        eventId: eventId,
        payerId: userId,
        hostStripeAccountId: host.stripeAccountId,
      },
      automatic_payment_methods: { enabled: true },
    });

    transaction.provider = "stripe";
    transaction.providerReference = intent.id;
    await transaction.save();

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
