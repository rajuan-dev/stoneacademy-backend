import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { SubscriptionController } from "./subscription.controller";

const router = Router();
const controller = new SubscriptionController();

router.get("/me", authMiddleware.verifyToken, controller.getMySubscription);
router.post("/activate", authMiddleware.verifyToken, controller.activate);
router.post("/cancel", authMiddleware.verifyToken, controller.cancel);

export default router;
