import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AdminNotificationController } from "./admin-notification.controller";

const router = Router();
const controller = new AdminNotificationController();

router.use(
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
);

router.get("/", controller.list);
router.get("/unread-count", controller.unreadCount);
router.patch("/:id/read", controller.markRead);
router.patch("/read-all", controller.markReadAll);

export default router;
