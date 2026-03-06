// file: src/services/stripe.service.ts

import { env } from "@/env";
import Stripe from "stripe";

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    });
  }

  async createPaymentIntent(params: Stripe.PaymentIntentCreateParams) {
    return this.stripe.paymentIntents.create(params);
  }

  async createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    return this.stripe.checkout.sessions.create(params);
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async retrieveCheckoutSession(
    sessionId: string,
    params?: Stripe.Checkout.SessionRetrieveParams,
  ) {
    return this.stripe.checkout.sessions.retrieve(sessionId, params);
  }

  async listCheckoutSessionsByPaymentIntent(
    paymentIntentId: string,
    limit: number = 1,
  ) {
    return this.stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit,
    });
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ) {
    const params = paymentMethodId
      ? { payment_method: paymentMethodId }
      : undefined;
    return this.stripe.paymentIntents.confirm(paymentIntentId, params);
  }

  async createConnectedExpressAccount(params: {
    email: string;
    metadata?: Record<string, string>;
  }) {
    return this.stripe.accounts.create({
      type: "express",
      email: params.email,
      metadata: params.metadata,
    });
  }

  async retrieveConnectedAccount(accountId: string) {
    return this.stripe.accounts.retrieve(accountId);
  }

  async createConnectedAccountOnboardingLink(params: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }) {
    return this.stripe.accountLinks.create({
      account: params.accountId,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
      type: "account_onboarding",
    });
  }

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    webhookSecret: string,
  ) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}

export const stripeService = new StripeService();
