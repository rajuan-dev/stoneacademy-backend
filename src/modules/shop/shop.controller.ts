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
  updateProductStatusSchema,
} from "./shop.schema";
import { ShopService } from "./shop.service";
import { BadRequestException } from "@/utils/app-error.utils";

export class ShopController {
  private static readonly MAX_CREATIVE_SIZE_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_CREATIVE_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
  ]);

  private service: ShopService;

  constructor() {
    this.service = new ShopService();
  }

  listProducts = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listProductsSchema, req);
    const result = await this.service.listProducts(validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Products fetched");
  });

  listAdminProducts = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listProductsSchema, req);
    const result = await this.service.listProducts(validated.query, {
      defaultActive: false,
    });
    ApiResponse.paginated(res, result.data, result.pagination, "Admin products fetched");
  });

  listAdminProductsTable = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listProductsSchema, req);
    const result = await this.service.listAdminProductsTable(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Admin product table fetched",
    );
  });

  createProduct = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createProductSchema, req);
    const file = req.file;
    if (file) {
      this.validateCreativeUpload(file);
    }
    const imageUpload = file
      ? {
          buffer: file.buffer,
          mimeType: file.mimetype,
          originalName: file.originalname,
        }
      : undefined;
    const {
      destinationUrl,
      ctaUrl,
      imageUrl,
      name,
      category,
      description,
      price,
      currency,
      stock,
      isActive,
    } = validated.body;
    const product = await this.service.createProduct(
      {
        name,
        category,
        description,
        price,
        currency,
        stock,
        isActive,
        imageUrl,
        ctaUrl: ctaUrl ?? destinationUrl!,
      },
      imageUpload,
    );
    ApiResponse.created(res, product, "Product created");
  });

  updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateProductSchema, req);
    const file = req.file;
    const hasBodyUpdates = Object.values(validated.body).some(
      (value) => value !== undefined,
    );
    if (!hasBodyUpdates && !file) {
      throw new BadRequestException("Provide at least one field or an image");
    }
    if (file) {
      this.validateCreativeUpload(file);
    }
    const imageUpload = file
      ? {
          buffer: file.buffer,
          mimeType: file.mimetype,
          originalName: file.originalname,
        }
      : undefined;
    const {
      destinationUrl,
      ctaUrl,
      imageUrl,
      name,
      category,
      description,
      price,
      currency,
      stock,
      isActive,
    } = validated.body;
    const payload = {
      name,
      category,
      description,
      price,
      currency,
      stock,
      isActive,
      imageUrl,
      ctaUrl: ctaUrl ?? destinationUrl,
    };
    const product = await this.service.updateProduct(
      validated.params.id,
      payload,
      imageUpload,
    );
    ApiResponse.success(res, product, "Product updated");
  });

  updateProductStatus = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateProductStatusSchema, req);
    const product = await this.service.updateProductStatus(
      validated.params.id,
      validated.body.isActive,
    );
    ApiResponse.success(res, product, "Product status updated");
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

  private validateCreativeUpload(file: Express.Multer.File) {
    if (!ShopController.ALLOWED_CREATIVE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Image must be PNG or JPG");
    }
    if (file.size > ShopController.MAX_CREATIVE_SIZE_BYTES) {
      throw new BadRequestException("Image size must not exceed 5MB");
    }
  }
}
