import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { OnboardingController } from "./onboarding.controller";

const router = Router();
const controller = new OnboardingController();

router.get("/slides", controller.slides);
router.get("/status", authMiddleware.verifyToken, controller.status);
router.post("/complete", authMiddleware.verifyToken, controller.complete);
router.post("/skip", authMiddleware.verifyToken, controller.skip);

export default router;
