import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth.middleware";

import { FeedController } from "./feed.controller";

const router = Router();
const controller = new FeedController();

router.get("/search-filter", authMiddleware.verifyToken, controller.searchFilter);
router.get("/", authMiddleware.verifyToken, controller.list);

export default router;
