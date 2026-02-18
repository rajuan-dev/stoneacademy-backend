// file: src/modules/admin-auth/admin-auth.route.ts

import { Router } from "express";
import { AdminAuthController } from "./admin-auth.controller";

const router = Router();
const controller = new AdminAuthController();

controller.registerRoutes(router);

export default router;

