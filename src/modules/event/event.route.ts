import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { EventController } from "./event.controller";

const router = Router();
const controller = new EventController();

router.get("/", controller.list);
router.post("/", authMiddleware.verifyToken, controller.create);
router.get("/:id", authMiddleware.optionalAuth, controller.getById);
router.patch("/:id", authMiddleware.verifyToken, controller.update);
router.delete("/:id", authMiddleware.verifyToken, controller.remove);
router.post("/:id/join", authMiddleware.verifyToken, controller.join);
router.post("/:id/leave", authMiddleware.verifyToken, controller.leave);
router.get("/:id/pass", authMiddleware.verifyToken, controller.pass);

export default router;
