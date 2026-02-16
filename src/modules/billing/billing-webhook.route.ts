import { Router } from "express";
import { stripeService } from "@/services/stripe.service";
import { env } from "@/env";
import { BillingService } from "./billing.service";
import { SubscriptionService } from "../subscription/subscription.service";

const router = Router();
const billingService = new BillingService();
const subscriptionService = new SubscriptionService();

router.post("/", async (req, res) => {
  try {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      return res.status(200).json({
        success: true,
        message: "Stripe webhook secret not configured. Ignored.",
      });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      return res.status(400).json({ success: false, message: "Missing signature" });
    }

    const event = stripeService.constructWebhookEvent(
      req.body as Buffer,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const paymentType = paymentIntent.metadata?.paymentType;

      if (paymentType === "subscription") {
        const subscriptionPaymentId = paymentIntent.metadata?.subscriptionPaymentId;
        if (subscriptionPaymentId) {
          await subscriptionService.markPaymentSucceededAndActivate(
            subscriptionPaymentId,
          );
        }
      } else {
        await billingService.markTransactionSucceededByProviderRef(
          paymentIntent.id,
          "stripe",
        );
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Webhook processing failed",
    });
  }
});

export default router;
