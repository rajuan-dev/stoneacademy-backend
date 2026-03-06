import { env } from "@/env";
import { stripeService } from "@/services/stripe.service";
import { Router } from "express";
import Stripe from "stripe";
import { HostStripeService } from "./host-stripe.service";

const router = Router();
const hostStripeService = new HostStripeService();

router.post("/webhook", async (req, res) => {
  try {
    const webhookSecret =
      env.STRIPE_CONNECT_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(200).json({
        success: true,
        message: "Stripe Connect webhook secret not configured. Ignored.",
      });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing Stripe signature",
      });
    }

    const event = stripeService.constructWebhookEvent(
      req.body as Buffer,
      signature,
      webhookSecret,
    );

    // Mark host onboarding as complete once Stripe enables charges.
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      await hostStripeService.syncOnboardingStatusFromStripeAccountUpdated({
        stripeAccountId: account.id,
        chargesEnabled: Boolean(account.charges_enabled),
      });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Stripe webhook processing failed",
    });
  }
});

export default router;
