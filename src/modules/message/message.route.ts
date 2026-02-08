import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { MessageController } from "./message.controller";

const router = Router();
const controller = new MessageController();

router.get(
  "/conversations",
  authMiddleware.verifyToken,
  controller.listConversations,
);
router.post(
  "/conversations/direct",
  authMiddleware.verifyToken,
  controller.createDirectConversation,
);
router.post(
  "/conversations/support",
  authMiddleware.verifyToken,
  controller.createSupportConversation,
);
router.get(
  "/conversations/:conversationId/messages",
  authMiddleware.verifyToken,
  controller.listMessages,
);
router.post("/", authMiddleware.verifyToken, controller.sendMessage);
router.post("/read", authMiddleware.verifyToken, controller.markConversationRead);
router.post("/typing", authMiddleware.verifyToken, controller.typing);

export default router;
