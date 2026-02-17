import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { SubscriptionController } from "./subscription.controller";

const router = Router();
const controller = new SubscriptionController();

router.get("/fees", controller.getSubscriptionFees);
router.get("/me", authMiddleware.verifyToken, controller.getMySubscription);
router.post(
  "/checkout-intent",
  authMiddleware.verifyToken,
  controller.createCheckoutIntent,
);
router.post("/confirm-payment", authMiddleware.verifyToken, controller.confirmPayment);
router.post("/cancel", authMiddleware.verifyToken, controller.cancel);

export default router;
