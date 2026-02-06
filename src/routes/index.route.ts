import authRouter from "@/modules/auth/auth.route";
import billingRouter from "@/modules/billing/billing.route";
import activityRouter from "@/modules/activity/activity.route";
import adminCategoryRouter from "@/modules/category/admin-category.route";
import categoryRouter from "@/modules/category/category.route";
import cleaningServiceRouter from "@/modules/cleaning-service/cleaning-service.route";
import cleaningReportRouter from "@/modules/cleaning-report/cleaning-report.route";
import quoteRouter from "@/modules/quote/quote.route";
import reviewRouter from "@/modules/review/review.route";
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
    path: "/activities",
    route: activityRouter,
  },
  {
    path: "/billing",
    route: billingRouter,
  },
  {
    path: "/services",
    route: cleaningServiceRouter,
  },
  {
    path: "/reports",
    route: cleaningReportRouter,
  },
  {
    path: "/reviews",
    route: reviewRouter,
  },
  {
    path: "/quotes",
    route: quoteRouter,
  },
  {
    path: "/users",
    route: userRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
