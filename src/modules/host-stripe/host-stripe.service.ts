import { env } from "@/env";
import { stripeService } from "@/services/stripe.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";

import { User } from "../user/user.model";

export class HostStripeService {
  async getHostMe(hostId: string) {
    const host = await User.findById(hostId).lean();
    if (!host) {
      throw new NotFoundException("Host not found");
    }

    return {
      _id: host._id.toString(),
      email: host.email,
      fullName: host.fullName,
      phone: host.phone || host.phoneNumber || null,
      phoneNumber: host.phoneNumber || host.phone || null,
      country: host.country || null,
      state: host.state || null,
      city: host.city || null,
      dob: host.dob ?? null,
      gender: host.gender ?? null,
      bio: host.bio || null,
      location: host.location || null,
      role: host.role,
      status: host.status,
      accountStatus: host.accountStatus,
      emailVerified: Boolean(host.emailVerified),
      emailVerifiedAt: host.emailVerifiedAt ?? null,
      rating: host.rating || { avg: 0, count: 0 },
      creatorStatus: host.creatorStatus || {
        subscriptionActive: false,
        subscriptionId: null,
      },
      profileImage: host.profileImageUrl || null,
      coverImage: host.coverImageUrl || null,
      stripeAccountId: host.stripeAccountId || null,
      stripeCustomerId: host.stripeCustomerId || null,
      stripeOnboardingCompleted: Boolean(host.stripeOnboardingCompleted),
      stripeDetailsSubmitted: Boolean(host.stripeDetailsSubmitted),
      stripeChargesEnabled: Boolean(host.stripeChargesEnabled),
      stripePayoutsEnabled: Boolean(host.stripePayoutsEnabled),
      stripeDisabledReason: host.stripeDisabledReason || null,
      hasStripeAccount: Boolean(host.stripeAccountId),
      createdAt: host.createdAt,
      updatedAt: host.updatedAt,
    };
  }

  async createConnectedAccountForHost(
    hostId: string,
    payload?: { email?: string },
  ) {
    this.ensureStripeConfigured();

    const host = await User.findById(hostId).exec();
    if (!host) {
      throw new NotFoundException("Host not found");
    }

    if (host.stripeAccountId) {
      return {
        stripeAccountId: host.stripeAccountId,
        stripeOnboardingCompleted: Boolean(host.stripeOnboardingCompleted),
      };
    }

    const account = await stripeService.createConnectedExpressAccount({
      email: payload?.email || host.email,
      metadata: {
        hostId: host._id.toString(),
        platform: "stoneacademy",
      },
    }).catch((error: any) => {
      this.handleStripeConnectSetupError(error);
    });

    host.stripeAccountId = account.id;
    host.stripeOnboardingCompleted = Boolean(account.charges_enabled);
    host.stripeChargesEnabled = Boolean(account.charges_enabled);
    host.stripePayoutsEnabled = Boolean(account.payouts_enabled);
    host.stripeDetailsSubmitted = Boolean(account.details_submitted);
    host.stripeDisabledReason = account.requirements?.disabled_reason || null;
    await host.save();

    return {
      stripeAccountId: host.stripeAccountId,
      stripeOnboardingCompleted: host.stripeOnboardingCompleted,
    };
  }

  async createOnboardingLinkForHost(
    hostId: string,
    payload?: { refreshUrl?: string; returnUrl?: string },
  ) {
    this.ensureStripeConfigured();

    const host = await User.findById(hostId).exec();
    if (!host) {
      throw new NotFoundException("Host not found");
    }

    if (!host.stripeAccountId) {
      const account = await stripeService.createConnectedExpressAccount({
        email: host.email,
        metadata: {
          hostId: host._id.toString(),
          platform: "stoneacademy",
        },
      }).catch((error: any) => {
        this.handleStripeConnectSetupError(error);
      });
      host.stripeAccountId = account.id;
      host.stripeOnboardingCompleted = Boolean(account.charges_enabled);
      host.stripeChargesEnabled = Boolean(account.charges_enabled);
      host.stripePayoutsEnabled = Boolean(account.payouts_enabled);
      host.stripeDetailsSubmitted = Boolean(account.details_submitted);
      host.stripeDisabledReason = account.requirements?.disabled_reason || null;
      await host.save();
    }

    const refreshUrl
      = payload?.refreshUrl || env.STRIPE_CONNECT_ONBOARDING_REFRESH_URL;
    const returnUrl = payload?.returnUrl || env.STRIPE_CONNECT_ONBOARDING_RETURN_URL;

    if (!refreshUrl || !returnUrl) {
      throw new BadRequestException(
        "Missing onboarding redirect URLs. Configure STRIPE_CONNECT_ONBOARDING_REFRESH_URL and STRIPE_CONNECT_ONBOARDING_RETURN_URL.",
      );
    }

    const accountLink = await stripeService.createConnectedAccountOnboardingLink({
      accountId: host.stripeAccountId!,
      refreshUrl,
      returnUrl,
    }).catch((error: any) => {
      this.handleStripeConnectSetupError(error);
    });

    return {
      stripeAccountId: host.stripeAccountId,
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    };
  }

  async createDashboardLoginLinkForHost(hostId: string) {
    this.ensureStripeConfigured();

    const host = await User.findById(hostId).exec();
    if (!host) {
      throw new NotFoundException("Host not found");
    }

    if (!host.stripeAccountId) {
      throw new BadRequestException(
        "Stripe account is not connected yet. Create Stripe account first.",
      );
    }

    const account = await stripeService.retrieveConnectedAccount(host.stripeAccountId)
      .catch((error: any) => {
        this.handleStripeConnectSetupError(error);
      });

    if (!account.details_submitted) {
      throw new BadRequestException(
        "Stripe onboarding is not complete yet. Complete onboarding before opening the dashboard.",
      );
    }

    const loginLink = await stripeService.createConnectedAccountLoginLink(
      host.stripeAccountId,
    ).catch((error: any) => {
      this.handleStripeConnectSetupError(error);
    });

    return {
      stripeAccountId: host.stripeAccountId,
      url: loginLink.url,
      createdAt: new Date(),
    };
  }

  async syncOnboardingStatusFromStripeAccountUpdated(params: {
    stripeAccountId: string;
    chargesEnabled: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    disabledReason?: string | null;
  }) {
    return User.findOneAndUpdate(
      { stripeAccountId: params.stripeAccountId },
      {
        stripeOnboardingCompleted: Boolean(params.chargesEnabled),
        stripeChargesEnabled: Boolean(params.chargesEnabled),
        stripePayoutsEnabled: Boolean(params.payoutsEnabled),
        stripeDetailsSubmitted: Boolean(params.detailsSubmitted),
        stripeDisabledReason: params.disabledReason || null,
      },
      { new: true },
    ).exec();
  }

  async syncOnboardingStatusForHost(hostId: string) {
    this.ensureStripeConfigured();

    const host = await User.findById(hostId).exec();
    if (!host) {
      throw new NotFoundException("Host not found");
    }
    if (!host.stripeAccountId) {
      throw new BadRequestException(
        "Stripe account is not connected yet. Create Stripe account first.",
      );
    }

    const account = await stripeService.retrieveConnectedAccount(host.stripeAccountId)
      .catch((error: any) => {
        this.handleStripeConnectSetupError(error);
      });

    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const detailsSubmitted = Boolean(account.details_submitted);
    host.stripeOnboardingCompleted = chargesEnabled;
    host.stripeChargesEnabled = chargesEnabled;
    host.stripePayoutsEnabled = payoutsEnabled;
    host.stripeDetailsSubmitted = detailsSubmitted;
    host.stripeDisabledReason = account.requirements?.disabled_reason || null;
    await host.save();

    return {
      stripeAccountId: host.stripeAccountId,
      stripeOnboardingCompleted: host.stripeOnboardingCompleted,
      chargesEnabled,
      detailsSubmitted,
      payoutsEnabled,
      disabledReason: host.stripeDisabledReason,
    };
  }

  private ensureStripeConfigured() {
    if (!env.STRIPE_SECRET_KEY) {
      throw new BadRequestException("Stripe is not configured");
    }
  }

  private handleStripeConnectSetupError(error: any): never {
    const message = String(error?.message || "");
    if (
      message.includes("signed up for Connect")
      || message.includes("https://dashboard.stripe.com/connect")
    ) {
      throw new BadRequestException(
        "Stripe Connect is not enabled on the platform account. Enable it at https://dashboard.stripe.com/connect and retry.",
      );
    }

    throw error;
  }
}
