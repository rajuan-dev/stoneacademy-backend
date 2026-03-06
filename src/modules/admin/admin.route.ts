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
router.get("/dashboard/metrics", controller.dashboardOverview);
router.get("/dashboard/analytics", controller.dashboardAnalytics);
router.get("/users", controller.listUsers);
router.get("/users/search", controller.searchUsers);
router.get("/users/blocked", controller.listBlockedUsers);
router.get("/users/:id", controller.getUserDetails);
router.patch("/users/:id/status", controller.updateUserStatus);
router.patch("/users/:id/role", controller.updateUserRole);
router.post("/users/:id/block", controller.blockUser);
router.post("/users/:id/unblock", controller.unblockUser);
router.get("/activities", controller.listActivities);
router.patch("/activities/:id/status", controller.updateActivityStatus);
router.get("/events", controller.listEvents);
router.patch("/events/:id/status", controller.updateEventStatus);
router.get("/subscriptions", controller.listSubscriptions);
router.get("/subscriptions/fees", controller.getSubscriptionFees);
router.patch("/subscriptions/fees", controller.updateSubscriptionFees);
router.get("/event-creators/premium", controller.listPremiumEventCreators);
router.get("/event-creators/premium/:id", controller.getPremiumEventCreatorDetails);
router.get("/event-creators", controller.listEventCreators);
router.get("/event-creators/:id", controller.getEventCreatorDetails);
router.post("/event-creators/:id/payout", controller.processEventCreatorPayout);
router.get("/earnings/transactions", controller.listEarningTransactions);
router.get("/earnings/transactions/:id", controller.getEarningTransactionDetails);
router.post("/earnings/transactions/:id/invoice", controller.generateEarningInvoice);

export default router;
