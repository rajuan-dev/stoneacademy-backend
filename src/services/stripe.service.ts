// file: src/services/stripe.service.ts

import type { Buffer } from "node:buffer";

import Stripe from "stripe";

import { env } from "@/env";

export class StripeService {
  private stripe?: Stripe;

  constructor() {
    if (env.STRIPE_SECRET_KEY?.trim()) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-12-15.clover",
      });
    }
  }

  private getClient(): Stripe {
    if (!this.stripe) {
      throw new Error("Stripe is not configured");
    }
    return this.stripe;
  }

  async createPaymentIntent(
    params: Stripe.PaymentIntentCreateParams,
    options?: Stripe.RequestOptions,
  ) {
    return this.getClient().paymentIntents.create(params, options);
  }

  async createEventPaymentIntent(
    params: Stripe.PaymentIntentCreateParams,
    idempotencyKey: string,
  ) {
    return this.getClient().paymentIntents.create(params, { idempotencyKey });
  }

  async createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    return this.getClient().checkout.sessions.create(params);
  }

  async retrievePaymentIntent(
    paymentIntentId: string,
    params?: Stripe.PaymentIntentRetrieveParams,
  ) {
    return this.getClient().paymentIntents.retrieve(paymentIntentId, params);
  }

  async createCustomer(params: Stripe.CustomerCreateParams) {
    return this.getClient().customers.create(params);
  }

  async createProduct(params: Stripe.ProductCreateParams) {
    return this.getClient().products.create(params);
  }

  async retrieveCustomer(customerId: string) {
    return this.getClient().customers.retrieve(customerId);
  }

  async createSubscription(params: Stripe.SubscriptionCreateParams) {
    return this.getClient().subscriptions.create(params);
  }

  async retrieveSubscription(
    subscriptionId: string,
    params?: Stripe.SubscriptionRetrieveParams,
  ) {
    return this.getClient().subscriptions.retrieve(subscriptionId, params);
  }

  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams,
  ) {
    return this.getClient().subscriptions.update(subscriptionId, params);
  }

  async retrieveInvoice(
    invoiceId: string,
    params?: Stripe.InvoiceRetrieveParams,
  ) {
    return this.getClient().invoices.retrieve(invoiceId, params);
  }

  async retrieveCheckoutSession(
    sessionId: string,
    params?: Stripe.Checkout.SessionRetrieveParams,
  ) {
    return this.getClient().checkout.sessions.retrieve(sessionId, params);
  }

  async listCheckoutSessionsByPaymentIntent(
    paymentIntentId: string,
    limit: number = 1,
  ) {
    return this.getClient().checkout.sessions.list({
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
    return this.getClient().paymentIntents.confirm(paymentIntentId, params);
  }

  async createConnectedExpressAccount(params: {
    email: string;
    metadata?: Record<string, string>;
  }) {
    return this.getClient().accounts.create({
      type: "express",
      email: params.email,
      metadata: params.metadata,
    });
  }

  async retrieveConnectedAccount(accountId: string) {
    return this.getClient().accounts.retrieve(accountId);
  }

  async createConnectedAccountLoginLink(accountId: string) {
    return this.getClient().accounts.createLoginLink(accountId);
  }

  async retrieveConnectedAccountBalance(accountId: string) {
    return this.getClient().balance.retrieve({}, { stripeAccount: accountId });
  }

  async createConnectedAccountPayout(
    accountId: string,
    params: Stripe.PayoutCreateParams,
  ) {
    return this.getClient().payouts.create(params, { stripeAccount: accountId });
  }

  async createCreatorTransfer(
    params: Stripe.TransferCreateParams,
    idempotencyKey: string,
  ) {
    return this.getClient().transfers.create(params, { idempotencyKey });
  }

  async reverseTransfer(
    transferId: string,
    params: Stripe.TransferCreateReversalParams,
    idempotencyKey: string,
  ) {
    return this.getClient().transfers.createReversal(
      transferId,
      params,
      { idempotencyKey },
    );
  }

  async createEventCancellationRefund(
    params: Stripe.RefundCreateParams,
    idempotencyKey: string,
  ) {
    return this.getClient().refunds.create(params, { idempotencyKey });
  }

  async createConnectedAccountOnboardingLink(params: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }) {
    return this.getClient().accountLinks.create({
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
    return this.getClient().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}

export const stripeService = new StripeService();
