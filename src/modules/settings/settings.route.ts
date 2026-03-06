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
router.get("/profile", controller.getProfileSettings);
router.put("/profile", controller.updateProfileSettings);
router.get("/security", controller.getSecuritySettings);
router.put("/security", controller.updateSecuritySettings);

export default router;
