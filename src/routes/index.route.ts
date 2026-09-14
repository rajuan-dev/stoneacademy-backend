import { Router } from "express";

import activityRouter from "@/modules/activity/activity.route";
import adminAuthRouter from "@/modules/admin-auth/admin-auth.route";
import adminNotificationRouter from "@/modules/admin-notification/admin-notification.route";
import adminRouter from "@/modules/admin/admin.route";
import adsRouter from "@/modules/ads/ads.route";
import authRouter from "@/modules/auth/auth.route";
import billingRouter from "@/modules/billing/billing.route";
import adminCategoryRouter from "@/modules/category/admin-category.route";
import categoryRouter from "@/modules/category/category.route";
import chatRouter from "@/modules/chat/chat.route";
import cmsRouter from "@/modules/cms/cms.route";
import communityCreatorRouter from "@/modules/community-creator/community-creator.route";
import communityRouter from "@/modules/community/community.route";
import eventRouter from "@/modules/event/event.route";
import feedRouter from "@/modules/feed/feed.route";
import hostStripeRouter from "@/modules/host-stripe/host-stripe.route";
import messageRouter from "@/modules/message/message.route";
import notificationRouter from "@/modules/notification/notification.route";
import onboardingRouter from "@/modules/onboarding/onboarding.route";
import reportRouter, { adminReportRouter } from "@/modules/report/report.route";
import reviewRouter from "@/modules/review/review.route";
import settingsRouter from "@/modules/settings/settings.route";
import shopRouter from "@/modules/shop/shop.route";
import subscriptionRouter from "@/modules/subscription/subscription.route";
import supportRouter from "@/modules/support/support.route";
import userRouter from "@/modules/user/user.route";

const router = Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: authRouter,
  },
  {
    path: "/categories",
    route: categoryRouter,
  },
  {
    path: "/admin/categories",
    route: adminCategoryRouter,
  },
  {
    path: "/admin",
    route: adminAuthRouter,
  },
  {
    path: "/admin",
    route: adminRouter,
  },
  {
    path: "/admin/settings",
    route: settingsRouter,
  },
  {
    path: "/admin/notifications",
    route: adminNotificationRouter,
  },
  {
    path: "/activities",
    route: activityRouter,
  },
  {
    path: "/events",
    route: eventRouter,
  },
  {
    path: "/subscriptions",
    route: subscriptionRouter,
  },
  {
    path: "/messages",
    route: messageRouter,
  },
  {
    path: "/notifications",
    route: notificationRouter,
  },
  {
    path: "/support",
    route: supportRouter,
  },
  {
    path: "/billing",
    route: billingRouter,
  },
  {
    path: "/reports",
    route: reportRouter,
  },
  {
    path: "/admin/reports",
    route: adminReportRouter,
  },
  {
    path: "/reviews",
    route: reviewRouter,
  },
  {
    path: "/users",
    route: userRouter,
  },
  {
    path: "/user",
    route: userRouter,
  },
  {
    path: "/onboarding",
    route: onboardingRouter,
  },
  {
    path: "/cms",
    route: cmsRouter,
  },
  {
    path: "/community",
    route: communityRouter,
  },
  {
    path: "/community-creator",
    route: communityCreatorRouter,
  },
  {
    path: "/ads",
    route: adsRouter,
  },
  {
    path: "/feed",
    route: feedRouter,
  },
  {
    path: "/chat",
    route: chatRouter,
  },
  {
    path: "/shop",
    route: shopRouter,
  },
  {
    path: "/hosts",
    route: hostStripeRouter,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
