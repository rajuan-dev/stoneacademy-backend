import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AdminController } from "./admin.controller";

const router = Router();
const controller = new AdminController();

router.use(
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
);

router.get("/dashboard/overview", controller.dashboardOverview);
router.get("/users", controller.listUsers);
router.patch("/users/:id/status", controller.updateUserStatus);
router.patch("/users/:id/role", controller.updateUserRole);

export default router;
