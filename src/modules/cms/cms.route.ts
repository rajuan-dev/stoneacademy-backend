import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { CmsController } from "./cms.controller";

const router = Router();
const controller = new CmsController();

router.get("/pages/:slug", controller.getBySlug);

router.get(
  "/admin/pages",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.list,
);
router.post(
  "/admin/pages",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.create,
);
router.patch(
  "/admin/pages/:slug",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.update,
);
router.delete(
  "/admin/pages/:slug",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.remove,
);

export default router;
