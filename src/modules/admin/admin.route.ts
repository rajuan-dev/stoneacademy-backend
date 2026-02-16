import { ROLES } from "@/constants/app.constants";
import upload from "@/config/multer.config";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AdminController } from "./admin.controller";

const router = Router();
const controller = new AdminController();

router.use(
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
);

router.get("/profile", controller.getMyProfile);
router.patch("/profile", upload.single("photo"), controller.updateMyProfile);
router.get("/dashboard/overview", controller.dashboardOverview);
router.get("/dashboard/analytics", controller.dashboardAnalytics);
router.get("/users", controller.listUsers);
router.patch("/users/:id/status", controller.updateUserStatus);
router.patch("/users/:id/role", controller.updateUserRole);
router.get("/activities", controller.listActivities);
router.patch("/activities/:id/status", controller.updateActivityStatus);
router.get("/events", controller.listEvents);
router.patch("/events/:id/status", controller.updateEventStatus);
router.get("/subscriptions", controller.listSubscriptions);
router.get("/subscriptions/fees", controller.getSubscriptionFees);
router.patch("/subscriptions/fees", controller.updateSubscriptionFees);
router.get("/event-creators/premium", controller.listPremiumEventCreators);
router.get("/event-creators/premium/:id", controller.getPremiumEventCreatorDetails);

export default router;
