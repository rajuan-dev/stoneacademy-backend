import {
  PAYMENT_STATUS,
  ROLES,
  SUBSCRIPTION_STATUS,
} from "@/constants/app.constants";
import { env } from "@/env";
import { stripeService } from "@/services/stripe.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import Stripe from "stripe";
import type { HydratedDocument } from "mongoose";
import { SettingsService } from "../settings/settings.service";
import { User } from "../user/user.model";
import { SubscriptionPayment } from "./subscription-payment.model";
import { Subscription, type ISubscription } from "./subscription.model";

type SubscriptionDocument = HydratedDocument<ISubscription>;
type BillingPlan = "monthly" | "yearly";
type StripeInvoiceLike = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  payment_intent?: string | Stripe.PaymentIntent | null;
};
type StripePaymentIntentLike = Stripe.PaymentIntent & {
  invoice?: string | Stripe.Invoice | null;
};

export class SubscriptionService {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  async getMySubscription(userId: string) {
    const subscription = await Subscription.findOne({ userId })
      .sort({ createdAt: -1 })
      .exec();

    const normalizedSubscription = await this.normalizeSubscriptionState(subscription);
    const isSubscribed = this.isSubscriptionActive(normalizedSubscription);

    await this.syncUserSubscriptionState(userId, normalizedSubscription, isSubscribed);

    return {
      isSubscribed,
      subscription: normalizedSubscription,
    };
  }

  async getSubscriptionFees() {
    const settings = await this.settingsService.getPlatformSettings();
    return {
      monthlyFee: settings.subscriptionMonthlyPrice,
      yearlyFee: settings.subscriptionYearlyPrice,
      currency: "USD",
    };
  }

  async createCheckoutIntent(userId: string, payload: { plan: BillingPlan }) {
    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    this.ensureStripeConfigured();

    const subscriptionItem = await this.buildSubscriptionItemForPlan(payload.plan);
    const activeSubscription = await Subscription.findOne({
      userId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endAt: { $gt: new Date() },
      cancelAtPeriodEnd: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .exec();

    if (activeSubscription) {
      throw new BadRequestException("An active subscription already exists");
    }

    const customerId = await this.getOrCreateStripeCustomer(userId);

    const stripeSubscription = await stripeService.createSubscription({
      customer: customerId,
      items: [subscriptionItem],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      collection_method: "charge_automatically",
      metadata: {
        paymentType: "subscription",
        userId,
        plan: payload.plan,
      },
      expand: ["latest_invoice.payment_intent"],
    });

    const normalized = await this.syncSubscriptionFromStripe(stripeSubscription);
    const latestInvoice = this.asInvoice(stripeSubscription.latest_invoice);
    const paymentIntent = latestInvoice
      ? this.asPaymentIntent((latestInvoice as StripeInvoiceLike).payment_intent)
      : null;

    if (!paymentIntent?.client_secret) {
      throw new BadRequestException(
        "Stripe did not return an invoice payment intent for this subscription.",
      );
    }

    return {
      subscriptionId: stripeSubscription.id,
      customerId,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      subscription: normalized,
    };
  }

  async confirmPayment(userId: string, paymentIntentId: string) {
    this.ensureStripeConfigured();

    const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);
    const paymentIntentObject = this.asPaymentIntent(paymentIntent);

    if (!paymentIntentObject || paymentIntentObject.status !== "succeeded") {
      throw new BadRequestException("Payment is not completed");
    }

    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    let subscriptionDoc: SubscriptionDocument | null = null;
    const invoiceId = typeof paymentIntentObject.invoice === "string"
      ? paymentIntentObject.invoice
      : paymentIntentObject.invoice?.id;

    if (invoiceId) {
      const invoice = await stripeService.retrieveInvoice(invoiceId, {
        expand: ["subscription", "payment_intent"],
      });
      const invoiceObject = invoice as StripeInvoiceLike;
      const stripeSubscription = this.asStripeSubscription(invoiceObject.subscription);
      if (stripeSubscription) {
        subscriptionDoc = await this.syncSubscriptionFromStripe(stripeSubscription);
      }
      await this.recordInvoicePayment(invoiceObject);
    }

    const latestSubscription = subscriptionDoc
      || await Subscription.findOne({ userId }).sort({ createdAt: -1 }).exec();
    const normalizedSubscription = await this.normalizeSubscriptionState(latestSubscription);
    const isSubscribed = this.isSubscriptionActive(normalizedSubscription);

    await this.syncUserSubscriptionState(userId, normalizedSubscription, isSubscribed);

    return {
      isSubscribed,
      subscription: normalizedSubscription,
    };
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const active = await Subscription.findOne({
      userId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .exec();

    const isSubscribed = Boolean(active);
    await this.syncUserSubscriptionState(userId, active, isSubscribed);

    return isSubscribed;
  }

  async cancel(userId: string) {
    this.ensureStripeConfigured();

    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const subscription = await Subscription.findOne({
      userId,
      status: {
        $in: [
          SUBSCRIPTION_STATUS.ACTIVE,
          SUBSCRIPTION_STATUS.PENDING,
          SUBSCRIPTION_STATUS.PAST_DUE,
        ],
      },
    })
      .sort({ createdAt: -1 })
      .exec();

    if (!subscription?.externalSubscriptionId) {
      throw new NotFoundException("Stripe subscription not found");
    }

    const updatedStripeSubscription = await stripeService.updateSubscription(
      subscription.externalSubscriptionId,
      { cancel_at_period_end: true },
    );

    const syncedSubscription = await this.syncSubscriptionFromStripe(
      updatedStripeSubscription,
    );

    return syncedSubscription;
  }

  async syncSubscriptionFromStripeWebhook(stripeSubscription: Stripe.Subscription) {
    return this.syncSubscriptionFromStripe(stripeSubscription);
  }

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const invoiceObject = invoice as StripeInvoiceLike;
    const stripeSubscription = await this.getStripeSubscriptionForInvoice(invoiceObject);
    if (stripeSubscription) {
      await this.syncSubscriptionFromStripe(stripeSubscription);
    }

    await this.recordInvoicePayment(invoiceObject);
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const invoiceObject = invoice as StripeInvoiceLike;
    const stripeSubscription = await this.getStripeSubscriptionForInvoice(invoiceObject);
    if (stripeSubscription) {
      await this.syncSubscriptionFromStripe(stripeSubscription);
    }

    await this.recordInvoicePayment(invoiceObject, PAYMENT_STATUS.FAILED);
  }

  private ensureStripeConfigured() {
    if (!env.STRIPE_SECRET_KEY) {
      throw new BadRequestException("Stripe is not configured");
    }
  }

  private async buildSubscriptionItemForPlan(
    plan: BillingPlan,
  ): Promise<Stripe.SubscriptionCreateParams.Item> {
    const priceId = plan === "yearly"
      ? env.STRIPE_YEARLY_PRICE_ID
      : env.STRIPE_MONTHLY_PRICE_ID;

    if (priceId?.trim()) {
      return { price: priceId.trim() };
    }

    const settings = await this.settingsService.getPlatformSettings();
    const amount = plan === "yearly"
      ? settings.subscriptionYearlyPrice
      : settings.subscriptionMonthlyPrice;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        `Invalid ${plan} subscription amount in platform settings.`,
      );
    }

    const product = await stripeService.createProduct({
      name: `StoneAcademy ${plan === "yearly" ? "Yearly" : "Monthly"} Subscription`,
      metadata: {
        billingPlan: plan,
        platform: "stoneacademy",
      },
    });

    return {
      price_data: {
        currency: "usd",
        unit_amount: Math.round(amount * 100),
        recurring: {
          interval: plan === "yearly" ? "year" : "month",
        },
        product: product.id,
      },
    };
  }

  private async getOrCreateStripeCustomer(userId: string) {
    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripeService.createCustomer({
      email: user.email,
      name: user.fullName,
      metadata: {
        userId: user._id.toString(),
        platform: "stoneacademy",
      },
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
  }

  private async syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription) {
    const metadataUserId = stripeSubscription.metadata?.userId;
    const subscriptionCustomerId = this.getStripeId(stripeSubscription.customer);
    const existing = await Subscription.findOne({
      $or: [
        { externalSubscriptionId: stripeSubscription.id },
        ...(metadataUserId ? [{ userId: metadataUserId }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .exec();

    const userId = metadataUserId || existing?.userId?.toString();
    if (!userId) {
      throw new BadRequestException(
        `Unable to match Stripe subscription ${stripeSubscription.id} to a user.`,
      );
    }

    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (subscriptionCustomerId && user.stripeCustomerId !== subscriptionCustomerId) {
      user.stripeCustomerId = subscriptionCustomerId;
      await user.save();
    }

    const subscriptionItem = stripeSubscription.items.data[0];
    const mappedStatus = this.mapStripeSubscriptionStatus(stripeSubscription.status);
    const currentPeriodStart = this.fromUnixSeconds(
      stripeSubscription.items.data[0]?.current_period_start
        || stripeSubscription.start_date,
    );
    const currentPeriodEnd = this.fromUnixSeconds(
      stripeSubscription.items.data[0]?.current_period_end
        || stripeSubscription.billing_cycle_anchor,
    );
    const latestInvoice = this.asInvoice(stripeSubscription.latest_invoice);
    const latestPaymentIntent = latestInvoice
      ? this.asPaymentIntent((latestInvoice as StripeInvoiceLike).payment_intent)
      : null;

    const subscription = existing || new Subscription({ userId });
    subscription.plan = this.resolvePlan(stripeSubscription, existing?.plan);
    subscription.status = mappedStatus;
    subscription.startAt = currentPeriodStart || existing?.startAt || new Date();
    subscription.endAt = currentPeriodEnd || existing?.endAt || new Date();
    subscription.currentPeriodStart = currentPeriodStart || undefined;
    subscription.currentPeriodEnd = currentPeriodEnd || undefined;
    subscription.cancelAtPeriodEnd = Boolean(stripeSubscription.cancel_at_period_end);
    subscription.cancelledAt = this.fromUnixSeconds(stripeSubscription.canceled_at) || undefined;
    subscription.paymentProvider = "stripe";
    subscription.externalCustomerId = subscriptionCustomerId || undefined;
    subscription.externalSubscriptionId = stripeSubscription.id;
    subscription.externalPriceId = subscriptionItem?.price?.id || undefined;
    subscription.latestInvoiceId = latestInvoice?.id || undefined;
    subscription.latestPaymentIntentId = latestPaymentIntent?.id || undefined;
    await subscription.save();

    const isSubscribed = this.isSubscriptionActive(subscription);
    await this.syncUserSubscriptionState(userId, subscription, isSubscribed);

    return subscription;
  }

  private async getStripeSubscriptionForInvoice(invoice: StripeInvoiceLike) {
    const stripeSubscription = this.asStripeSubscription(invoice.subscription);
    if (stripeSubscription) {
      return stripeSubscription;
    }

    const subscriptionId = this.getStripeId(invoice.subscription);
    if (!subscriptionId) {
      return null;
    }

    return stripeService.retrieveSubscription(subscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    });
  }

  private async recordInvoicePayment(
    invoice: StripeInvoiceLike,
    statusOverride?: (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS],
  ) {
    const subscriptionId = this.getStripeId(invoice.subscription);
    if (!subscriptionId) {
      return null;
    }

    const subscription = await Subscription.findOne({
      externalSubscriptionId: subscriptionId,
    })
      .sort({ createdAt: -1 })
      .exec();

    if (!subscription) {
      return null;
    }

    const paymentIntent = this.asPaymentIntent(invoice.payment_intent);
    const amountValue = statusOverride === PAYMENT_STATUS.FAILED
      ? invoice.amount_due
      : (invoice.amount_paid || invoice.amount_due);

    return SubscriptionPayment.findOneAndUpdate(
      { invoiceId: invoice.id },
      {
        userId: subscription.userId,
        plan: subscription.plan,
        amount: Number((amountValue / 100).toFixed(2)),
        currency: (invoice.currency || "usd").toUpperCase(),
        status: statusOverride || PAYMENT_STATUS.SUCCEEDED,
        provider: "stripe",
        providerReference: invoice.id,
        externalSubscriptionId: subscriptionId,
        invoiceId: invoice.id,
        paymentIntentId: paymentIntent?.id,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).exec();
  }

  private resolvePlan(
    stripeSubscription: Stripe.Subscription,
    fallbackPlan?: BillingPlan,
  ): BillingPlan {
    const planFromMetadata = stripeSubscription.metadata?.plan;
    if (planFromMetadata === "monthly" || planFromMetadata === "yearly") {
      return planFromMetadata;
    }

    const priceId = stripeSubscription.items.data[0]?.price?.id;
    if (priceId && priceId === env.STRIPE_YEARLY_PRICE_ID) {
      return "yearly";
    }
    if (priceId && priceId === env.STRIPE_MONTHLY_PRICE_ID) {
      return "monthly";
    }

    return fallbackPlan || "monthly";
  }

  private mapStripeSubscriptionStatus(
    stripeStatus: Stripe.Subscription.Status,
  ): (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS] {
    switch (stripeStatus) {
      case "active":
      case "trialing":
        return SUBSCRIPTION_STATUS.ACTIVE;
      case "past_due":
        return SUBSCRIPTION_STATUS.PAST_DUE;
      case "unpaid":
        return SUBSCRIPTION_STATUS.UNPAID;
      case "canceled":
        return SUBSCRIPTION_STATUS.CANCELLED;
      case "incomplete":
        return SUBSCRIPTION_STATUS.PENDING;
      case "incomplete_expired":
        return SUBSCRIPTION_STATUS.EXPIRED;
      default:
        return SUBSCRIPTION_STATUS.PENDING;
    }
  }

  private isSubscriptionActive(
    subscription: SubscriptionDocument | null,
  ) {
    return Boolean(
      subscription
      && subscription.status === SUBSCRIPTION_STATUS.ACTIVE
      && subscription.endAt > new Date(),
    );
  }

  private async normalizeSubscriptionState(
    subscription: SubscriptionDocument | null,
  ) {
    if (!subscription) {
      return null;
    }

    if (
      subscription.status === SUBSCRIPTION_STATUS.ACTIVE
      && subscription.endAt <= new Date()
    ) {
      subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
      await subscription.save();
    }

    return subscription;
  }

  private async syncUserSubscriptionState(
    userId: string,
    subscription: SubscriptionDocument | null,
    isSubscribed: boolean,
  ) {
    const user = await User.findById(userId).exec();
    if (!user) {
      return;
    }

    const nextRole = isSubscribed && user.role === ROLES.USER
      ? ROLES.CREATOR
      : !isSubscribed && user.role === ROLES.CREATOR
          ? ROLES.USER
          : user.role;

    const nextCreatorStatus = {
      subscriptionActive: isSubscribed,
      subscriptionId: isSubscribed ? subscription?._id?.toString?.() || null : null,
    };

    const hasCreatorStatusChanged
      = user.creatorStatus?.subscriptionActive !== nextCreatorStatus.subscriptionActive
        || user.creatorStatus?.subscriptionId !== nextCreatorStatus.subscriptionId;

    if (!hasCreatorStatusChanged && user.role === nextRole) {
      return;
    }

    user.creatorStatus = nextCreatorStatus;
    user.role = nextRole;
    await user.save();
  }

  private getStripeId(
    value:
      | string
      | Stripe.Customer
      | Stripe.DeletedCustomer
      | Stripe.Subscription
      | Stripe.Invoice
      | null
      | undefined,
  ) {
    if (!value) {
      return null;
    }
    return typeof value === "string" ? value : value.id;
  }

  private fromUnixSeconds(timestamp?: number | null) {
    if (!timestamp) {
      return null;
    }
    return new Date(timestamp * 1000);
  }

  private asInvoice(
    invoice: Stripe.Subscription["latest_invoice"] | string | null | undefined,
  ) {
    if (!invoice || typeof invoice === "string") {
      return null;
    }

    if ("object" in invoice && invoice.object === "invoice") {
      return invoice;
    }

    return null;
  }

  private asPaymentIntent(
    paymentIntent:
      | StripePaymentIntentLike
      | Stripe.Response<Stripe.PaymentIntent>
      | string
      | null
      | undefined,
  ) {
    if (!paymentIntent || typeof paymentIntent === "string") {
      return null;
    }

    if ("object" in paymentIntent && paymentIntent.object === "payment_intent") {
      return paymentIntent as StripePaymentIntentLike;
    }

    return null;
  }

  private asStripeSubscription(
    subscription:
      | string
      | Stripe.Subscription
      | Stripe.Response<Stripe.Subscription>
      | null
      | undefined,
  ) {
    if (!subscription || typeof subscription === "string") {
      return null;
    }

    if ("object" in subscription && subscription.object === "subscription") {
      return subscription as Stripe.Subscription;
    }

    return null;
  }
}
