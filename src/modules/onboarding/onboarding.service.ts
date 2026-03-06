import { User } from "@/modules/user/user.model";
import { NotFoundException } from "@/utils/app-error.utils";
import { ONBOARDING_SLIDES } from "./onboarding.constants";

export class OnboardingService {
  getSlides() {
    return ONBOARDING_SLIDES;
  }

  async getStatus(userId: string) {
    const user = await User.findById(userId)
      .select("onboardingCompletedAt onboardingSkippedAt")
      .exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return {
      onboardingCompletedAt: user.onboardingCompletedAt || null,
      onboardingSkippedAt: user.onboardingSkippedAt || null,
    };
  }

  async markCompleted(userId: string) {
    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.onboardingCompletedAt = new Date();
    user.onboardingSkippedAt = undefined;
    await user.save();
    return {
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboardingSkippedAt: user.onboardingSkippedAt || null,
    };
  }

  async markSkipped(userId: string) {
    const user = await User.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (!user.onboardingCompletedAt) {
      user.onboardingSkippedAt = new Date();
    }
    await user.save();
    return {
      onboardingCompletedAt: user.onboardingCompletedAt || null,
      onboardingSkippedAt: user.onboardingSkippedAt || null,
    };
  }
}
