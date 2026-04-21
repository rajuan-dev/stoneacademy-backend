import { env } from "@/env";
import { stripeService } from "@/services/stripe.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { User } from "../user/user.model";

export class HostStripeService {
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
      await host.save();
    }

    const refreshUrl =
      payload?.refreshUrl || env.STRIPE_CONNECT_ONBOARDING_REFRESH_URL;
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
  }) {
    if (!params.chargesEnabled) {
      return null;
    }

    return User.findOneAndUpdate(
      { stripeAccountId: params.stripeAccountId },
      { stripeOnboardingCompleted: true },
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
    host.stripeOnboardingCompleted = chargesEnabled;
    await host.save();

    return {
      stripeAccountId: host.stripeAccountId,
      stripeOnboardingCompleted: host.stripeOnboardingCompleted,
      chargesEnabled,
      detailsSubmitted: Boolean(account.details_submitted),
      payoutsEnabled: Boolean(account.payouts_enabled),
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
