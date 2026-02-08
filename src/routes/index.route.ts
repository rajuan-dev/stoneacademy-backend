import authRouter from "@/modules/auth/auth.route";
import billingRouter from "@/modules/billing/billing.route";
import activityRouter from "@/modules/activity/activity.route";
import adminCategoryRouter from "@/modules/category/admin-category.route";
import adminRouter from "@/modules/admin/admin.route";
import categoryRouter from "@/modules/category/category.route";
import eventRouter from "@/modules/event/event.route";
import reportRouter from "@/modules/report/report.route";
import reviewRouter from "@/modules/review/review.route";
import subscriptionRouter from "@/modules/subscription/subscription.route";
import messageRouter from "@/modules/message/message.route";
import notificationRouter from "@/modules/notification/notification.route";
import supportRouter from "@/modules/support/support.route";
import userRouter from "@/modules/user/user.route";
import onboardingRouter from "@/modules/onboarding/onboarding.route";
import shopRouter from "@/modules/shop/shop.route";
import settingsRouter from "@/modules/settings/settings.route";

import { Router } from "express";

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
    route: adminRouter,
  },
  {
    path: "/admin/settings",
    route: settingsRouter,
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
    path: "/reviews",
    route: reviewRouter,
  },
  {
    path: "/users",
    route: userRouter,
  },
  {
    path: "/onboarding",
    route: onboardingRouter,
  },
  {
    path: "/shop",
    route: shopRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
