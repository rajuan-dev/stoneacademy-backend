import type { Buffer } from "node:buffer";
import type Stripe from "stripe";

import { Router } from "express";

import { env } from "@/env";
import { stripeService } from "@/services/stripe.service";

import { SubscriptionService } from "../subscription/subscription.service";
import { BillingService } from "./billing.service";
import { StripeWebhookEvent } from "./stripe-webhook-event.model";

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
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentType = paymentIntent.metadata?.paymentType;
        const latestCharge
          = typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : paymentIntent.latest_charge?.id;

        if (paymentType === "subscription") {
          await subscriptionService.confirmPayment(
            paymentIntent.metadata?.userId || "",
            paymentIntent.id,
          );
        }
        else if (paymentType === "event_ticket") {
          await billingService.handleEventTicketPaymentSucceeded(
            paymentIntent.id,
            latestCharge,
          );
        }
        else {
          await billingService.markTransactionSucceededByProviderRef(
            paymentIntent.id,
            "stripe",
          );
        }
      }
      else if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata?.paymentType === "event_ticket") {
          await billingService.markTransactionFailedByProviderRef(
            paymentIntent.id,
            paymentIntent.last_payment_error?.message || undefined,
            "stripe",
          );
        }
      }
      else if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        const refund = charge.refunds?.data?.[0];
        if (refund?.id) {
          await billingService.handleRefundUpdated(refund.id, refund.status);
        }
      }
      else if (event.type === "refund.updated" || event.type === "refund.failed") {
        const refund = event.data.object as Stripe.Refund;
        await billingService.handleRefundUpdated(refund.id, refund.status);
      }
      else if (event.type === "charge.dispute.created") {
        const dispute = event.data.object as Stripe.Dispute;
        await billingService.markDisputeCreated({
          disputeId: dispute.id,
          chargeId: typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id,
          paymentIntentId: typeof dispute.payment_intent === "string"
            ? dispute.payment_intent
            : dispute.payment_intent?.id,
          reason: dispute.reason,
        });
      }
      else if (event.type === "invoice.payment_succeeded") {
        await subscriptionService.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
      }
      else if (event.type === "invoice.payment_failed") {
        await subscriptionService.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
      }
      else if (
        event.type === "customer.subscription.created"
        || event.type === "customer.subscription.updated"
        || event.type === "customer.subscription.deleted"
      ) {
        await subscriptionService.syncSubscriptionFromStripeWebhook(
          event.data.object as Stripe.Subscription,
        );
      }

      webhookEvent.status = "processed";
      webhookEvent.processedAt = new Date();
      webhookEvent.error = undefined;
      await webhookEvent.save();
    }
    catch (error: any) {
      webhookEvent.status = "failed";
      webhookEvent.error = error?.message || "Webhook processing failed";
      await webhookEvent.save();
      throw error;
    }

    return res.status(200).json({ success: true });
  }
  catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Webhook processing failed",
    });
  }
});

export default router;
