import { Router } from "express";
import { FeedController } from "./feed.controller";
import { authMiddleware } from "@/middlewares/auth.middleware";

const router = Router();
const controller = new FeedController();

router.get("/search-filter", authMiddleware.verifyToken, controller.searchFilter);
router.get("/", authMiddleware.verifyToken, controller.list);

export default router;
