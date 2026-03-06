import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { HostStripeController } from "./host-stripe.controller";

const router = Router();
const controller = new HostStripeController();

router.post(
  "/create-stripe-account",
  authMiddleware.verifyToken,
  controller.createStripeAccount,
);

router.post(
  "/create-onboarding-link",
  authMiddleware.verifyToken,
  controller.createOnboardingLink,
);

router.post(
  "/sync-onboarding-status",
  authMiddleware.verifyToken,
  controller.syncOnboardingStatus,
);

export default router;
