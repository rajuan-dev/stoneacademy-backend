import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { ShopController } from "./shop.controller";

const router = Router();
const controller = new ShopController();

router.get("/cart", authMiddleware.verifyToken, controller.getCart);
router.post("/cart/items", authMiddleware.verifyToken, controller.addToCart);
router.patch(
  "/cart/items/:productId",
  authMiddleware.verifyToken,
  controller.updateCartItem,
);
router.delete(
  "/cart/items/:productId",
  authMiddleware.verifyToken,
  controller.removeCartItem,
);

router.post("/checkout", authMiddleware.verifyToken, controller.checkout);

export default router;
