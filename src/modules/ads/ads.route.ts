import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AdsController } from "./ads.controller";

const router = Router();
const controller = new AdsController();

router.get("/", controller.listActive);

router.get(
  "/admin",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.list,
);
router.post(
  "/admin",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.create,
);
router.patch(
  "/admin/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.update,
);
router.delete(
  "/admin/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.remove,
);

export default router;
