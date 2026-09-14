import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth.middleware";

import { ReviewController } from "./review.controller";

const router = Router();
const controller = new ReviewController();

router.get("/", controller.list);
router.post("/", authMiddleware.verifyToken, controller.create);

export default router;
