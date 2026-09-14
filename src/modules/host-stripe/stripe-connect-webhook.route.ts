import type { Buffer } from "node:buffer";
import type Stripe from "stripe";

import { Router } from "express";

import { env } from "@/env";
import { stripeService } from "@/services/stripe.service";

import { StripeWebhookEvent } from "../billing/stripe-webhook-event.model";
import { HostStripeService } from "./host-stripe.service";

const router = Router();
const hostStripeService = new HostStripeService();

router.post("/webhook", async (req, res) => {
  try {
    const webhookSecret
      = env.STRIPE_CONNECT_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET;

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

    const existingWebhookEvent = await StripeWebhookEvent.findOne({
      stripeEventId: event.id,
      status: "processed",
    }).lean();
    if (existingWebhookEvent) {
      return res.status(200).json({ success: true, duplicate: true });
    }

    const webhookEvent = await StripeWebhookEvent.findOneAndUpdate(
      { stripeEventId: event.id },
      {
        $setOnInsert: {
          stripeEventId: event.id,
          eventType: event.type,
          status: "processing",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    try {
      if (event.type === "account.updated") {
        const account = event.data.object as Stripe.Account;
        await hostStripeService.syncOnboardingStatusFromStripeAccountUpdated({
          stripeAccountId: account.id,
          chargesEnabled: Boolean(account.charges_enabled),
          payoutsEnabled: Boolean(account.payouts_enabled),
          detailsSubmitted: Boolean(account.details_submitted),
          disabledReason: account.requirements?.disabled_reason || null,
        });
      }

      webhookEvent.status = "processed";
      webhookEvent.processedAt = new Date();
      webhookEvent.error = undefined;
      await webhookEvent.save();
    }
    catch (error: any) {
      webhookEvent.status = "failed";
      webhookEvent.error = error?.message || "Stripe webhook processing failed";
      await webhookEvent.save();
      throw error;
    }

    return res.status(200).json({ success: true });
  }
  catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Stripe webhook processing failed",
    });
  }
});

export default router;
