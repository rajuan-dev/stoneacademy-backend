import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { NotificationController } from "./notification.controller";

const router = Router();
const controller = new NotificationController();

router.get("/", authMiddleware.verifyToken, controller.list);
router.get(
  "/unread-count",
  authMiddleware.verifyToken,
  controller.unreadCount,
);
router.patch("/:id/read", authMiddleware.verifyToken, controller.markRead);
router.patch("/read-all", authMiddleware.verifyToken, controller.markReadAll);
router.delete("/:id", authMiddleware.verifyToken, controller.remove);

export default router;
