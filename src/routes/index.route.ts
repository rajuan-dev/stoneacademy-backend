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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
