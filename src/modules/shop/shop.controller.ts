import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  addCartItemSchema,
  cartItemIdSchema,
  createProductSchema,
  listProductsSchema,
  productIdSchema,
  updateCartItemSchema,
  updateProductSchema,
} from "./shop.schema";
import { ShopService } from "./shop.service";

export class ShopController {
  private service: ShopService;

  constructor() {
    this.service = new ShopService();
  }

  listProducts = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listProductsSchema, req);
    const result = await this.service.listProducts(validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Products fetched");
  });

  getProduct = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(productIdSchema, req);
    const product = await this.service.getProduct(validated.params.id);
    ApiResponse.success(res, product, "Product fetched");
  });

  createProduct = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createProductSchema, req);
    const product = await this.service.createProduct(validated.body);
    ApiResponse.created(res, product, "Product created");
  });

  updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateProductSchema, req);
    const product = await this.service.updateProduct(
      validated.params.id,
      validated.body,
    );
    ApiResponse.success(res, product, "Product updated");
  });

  deleteProduct = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(productIdSchema, req);
    const result = await this.service.deleteProduct(validated.params.id);
    ApiResponse.success(res, result, "Product deleted");
  });

  getCart = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const cart = await this.service.getCart(userId);
    ApiResponse.success(res, cart, "Cart fetched");
  });

  addToCart = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(addCartItemSchema, req);
    const userId = req.user?.userId as string;
    const cart = await this.service.addToCart(
      userId,
      validated.body.productId,
      validated.body.quantity,
    );
    ApiResponse.success(res, cart, "Item added to cart");
  });

  updateCartItem = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateCartItemSchema, req);
    const userId = req.user?.userId as string;
    const cart = await this.service.updateCartItem(
      userId,
      validated.params.productId,
      validated.body.quantity,
    );
    ApiResponse.success(res, cart, "Cart updated");
  });

  removeCartItem = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(cartItemIdSchema, req);
    const userId = req.user?.userId as string;
    const cart = await this.service.removeCartItem(
      userId,
      validated.params.productId,
    );
    ApiResponse.success(res, cart, "Cart item removed");
  });

  checkout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const order = await this.service.checkout(userId);
    ApiResponse.success(res, order, "Order placed");
  });
}
