import { authMiddleware } from "@/middlewares/auth.middleware";
import upload from "@/config/multer.config";
import { Router } from "express";
import { EventController } from "./event.controller";

const router = Router();
const controller = new EventController();

router.get("/", authMiddleware.optionalAuth, controller.list);
router.post(
  "/",
  authMiddleware.verifyToken,
  upload.any(),
  controller.create,
);
router.get("/:id/fee", controller.getFee);
router.get("/:id/join-status", authMiddleware.verifyToken, controller.getJoinStatus);
router.get("/:id/joined-users", authMiddleware.verifyToken, controller.getJoinedUsers);
router.get("/:id", authMiddleware.optionalAuth, controller.getById);
router.patch("/:id", authMiddleware.verifyToken, controller.update);
router.delete("/:id", authMiddleware.verifyToken, controller.remove);
router.post("/:id/join", authMiddleware.verifyToken, controller.join);
router.post("/:id/leave", authMiddleware.verifyToken, controller.leave);
router.get("/:id/pass", authMiddleware.verifyToken, controller.pass);
router.post("/:id/message-host", authMiddleware.verifyToken, controller.messageHost);

export default router;
