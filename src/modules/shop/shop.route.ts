import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { ShopController } from "./shop.controller";

const router = Router();
const controller = new ShopController();

router.get("/products", controller.listProducts);
router.get("/products/:id", controller.getProduct);

router.post(
  "/products",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.createProduct,
);
router.patch(
  "/products/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.updateProduct,
);
router.delete(
  "/products/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  controller.deleteProduct,
);

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
