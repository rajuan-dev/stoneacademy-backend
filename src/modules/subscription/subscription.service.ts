import { ROLES, SUBSCRIPTION_STATUS } from "@/constants/app.constants";
import { NotFoundException } from "@/utils/app-error.utils";
import { User } from "../user/user.model";
import { Subscription } from "./subscription.model";

export class SubscriptionService {
  async getMySubscription(userId: string) {
    return Subscription.findOne({ userId }).sort({ createdAt: -1 }).exec();
  }

  async activate(userId: string, payload: {
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
