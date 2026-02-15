import { Router } from "express";
import { FeedController } from "./feed.controller";

const router = Router();
const controller = new FeedController();

router.get("/search-filter", controller.searchFilter);
router.get("/", controller.list);

export default router;
