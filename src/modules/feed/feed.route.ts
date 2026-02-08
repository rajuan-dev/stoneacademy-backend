import { Router } from "express";
import { FeedController } from "./feed.controller";

const router = Router();
const controller = new FeedController();

router.get("/", controller.list);

export default router;
