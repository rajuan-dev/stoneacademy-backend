import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { CmsController } from "./cms.controller";

const router = Router();
const controller = new CmsController();

router.get("/about-us", controller.getAboutUs);
router.get("/privacy-policy", controller.getPrivacyPolicy);
router.get("/terms-and-conditions", controller.getTermsAndConditions);
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
router.put(
  "/admin/about-us",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.upsertAboutUs,
);
router.put(
  "/admin/privacy-policy",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.upsertPrivacyPolicy,
);
router.put(
  "/admin/terms-and-conditions",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.upsertTermsAndConditions,
);
router.delete(
  "/admin/pages/:slug",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.remove,
);

export default router;
