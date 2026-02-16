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
import { SettingsService } from "../settings/settings.service";
import { User } from "../user/user.model";
import { SubscriptionPayment } from "./subscription-payment.model";
import { Subscription } from "./subscription.model";

export class SubscriptionService {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  async getMySubscription(userId: string) {
    return Subscription.findOne({ userId }).sort({ createdAt: -1 }).exec();
  }

  async createCheckoutIntent(userId: string, payload: { plan: "monthly" | "yearly" }) {
    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!env.STRIPE_SECRET_KEY) {
      throw new BadRequestException("Stripe is not configured");
    }

    const settings = await this.settingsService.getPlatformSettings();
    const amount =
      payload.plan === "yearly"
        ? settings.subscriptionYearlyPrice
        : settings.subscriptionMonthlyPrice;

    if (amount <= 0) {
      throw new BadRequestException(
        "Subscription fee must be greater than 0. Ask admin to set a valid fee.",
      );
    }

    const payment = await SubscriptionPayment.create({
      userId,
      plan: payload.plan,
      amount: Number(amount.toFixed(2)),
      currency: "USD",
      status: PAYMENT_STATUS.PENDING,
      provider: "stripe",
    });

    const paymentIntent = await stripeService.createPaymentIntent({
      amount: Math.round(payment.amount * 100),
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        paymentType: "subscription",
        subscriptionPaymentId: payment._id.toString(),
        userId,
        plan: payload.plan,
      },
    });

    payment.providerReference = paymentIntent.id;
    await payment.save();

    return {
      paymentIntentClientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      payment,
    };
  }

  async confirmPayment(userId: string, paymentIntentId: string) {
    const payment = await SubscriptionPayment.findOne({
      userId,
      provider: "stripe",
      providerReference: paymentIntentId,
    })
      .sort({ createdAt: -1 })
      .exec();

    if (!payment) {
      throw new NotFoundException("Subscription payment not found");
    }

    const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      throw new BadRequestException("Payment is not completed");
    }

    const subscription = await this.markPaymentSucceededAndActivate(payment._id.toString());
    return {
      payment,
      subscription,
    };
  }

  async markPaymentSucceededAndActivate(subscriptionPaymentId: string) {
    const payment = await SubscriptionPayment.findById(subscriptionPaymentId).exec();
    if (!payment) {
      throw new NotFoundException("Subscription payment not found");
    }

    if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
      const existingSubscription = await Subscription.findOne({
        userId: payment.userId,
        externalSubscriptionId: payment.providerReference,
      })
        .sort({ createdAt: -1 })
        .exec();
      if (existingSubscription) return existingSubscription;
    }

    payment.status = PAYMENT_STATUS.SUCCEEDED;
    await payment.save();

    return this.activate(payment.userId.toString(), {
      plan: payment.plan,
      paymentProvider: payment.provider,
      externalSubscriptionId: payment.providerReference,
    });
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const active = await Subscription.findOne({
      userId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      endAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .exec();

    const user = await User.findById(userId).exec();
    if (user) {
      user.creatorStatus = {
        subscriptionActive: Boolean(active),
        subscriptionId: active?._id?.toString?.() || null,
      };
      if (active && user.role === ROLES.USER) {
        user.role = ROLES.CREATOR;
      }
      if (!active && user.role === ROLES.CREATOR) {
        user.role = ROLES.USER;
      }
      await user.save();
    }

    return Boolean(active);
  }

  private async activate(userId: string, payload: {
    plan: "monthly" | "yearly";
    paymentProvider?: string;
    externalSubscriptionId?: string;
  }) {
    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const now = new Date();
    const endAt = new Date(now);
    endAt.setDate(endAt.getDate() + (payload.plan === "yearly" ? 365 : 30));

    await Subscription.updateMany(
      { userId, status: SUBSCRIPTION_STATUS.ACTIVE },
      { status: SUBSCRIPTION_STATUS.EXPIRED },
    ).exec();

    const subscription = await Subscription.create({
      userId,
      plan: payload.plan,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      startAt: now,
      endAt,
      paymentProvider: payload.paymentProvider || "manual",
      externalSubscriptionId: payload.externalSubscriptionId,
    });

    user.creatorStatus = {
      subscriptionActive: true,
      subscriptionId: subscription._id.toString(),
    };

    if (user.role === ROLES.USER) {
      user.role = ROLES.CREATOR;
    }

    await user.save();

    return subscription;
  }

  async cancel(userId: string) {
    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const subscription = await Subscription.findOne({
      userId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
    })
      .sort({ createdAt: -1 })
      .exec();

    if (subscription) {
      subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
      subscription.cancelledAt = new Date();
      await subscription.save();
    }

    user.creatorStatus = {
      subscriptionActive: false,
      subscriptionId: null,
    };

    if (user.role === ROLES.CREATOR) {
      user.role = ROLES.USER;
    }

    await user.save();

    return subscription;
  }
}
