import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { SettingsController } from "./settings.controller";

const router = Router();
const controller = new SettingsController();

router.use(
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
);

router.get("/platform", controller.getPlatformSettings);
router.patch("/platform", controller.updatePlatformSettings);

export default router;
