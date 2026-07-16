import { BadRequestException } from "@/utils/app-error.utils";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { AdsService } from "./ads.service";
import {
  adIdSchema,
  createAdSchema,
  listActiveAdsSchema,
  listAdsSchema,
  updateAdSchema,
} from "./ads.schema";

export class AdsController {
  private static readonly MAX_CREATIVE_SIZE_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_CREATIVE_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
  ]);

  private service: AdsService;

  constructor() {
    this.service = new AdsService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listAdsSchema, req);
    const result = await this.service.list(validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Ads fetched");
  });

  listActive = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listActiveAdsSchema, req);
    const ads = await this.service.listActive({
      ...validated.query,
      viewerUserId: req.user?.userId,
    });
    ApiResponse.success(res, ads, "Active ads fetched");
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createAdSchema, req);
    const file = req.file;
    if (file) {
      this.validateCreativeUpload(file);
    }
    if (!validated.body.imageUrl && !file) {
      throw new BadRequestException("Provide an ad image URL or upload an image");
    }
    const imageUpload = file
      ? {
          buffer: file.buffer,
          mimeType: file.mimetype,
          originalName: file.originalname,
        }
      : undefined;
    const ad = await this.service.create(validated.body, imageUpload);
    ApiResponse.created(res, ad, "Ad created");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateAdSchema, req);
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
    const ad = await this.service.update(validated.params.id, validated.body, imageUpload);
    ApiResponse.success(res, ad, "Ad updated");
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(adIdSchema, req);
    const result = await this.service.remove(validated.params.id);
    ApiResponse.success(res, result, "Ad deleted");
  });

  private validateCreativeUpload(file: Express.Multer.File) {
    if (!AdsController.ALLOWED_CREATIVE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Image must be PNG, JPG, or WEBP");
    }
    if (file.size > AdsController.MAX_CREATIVE_SIZE_BYTES) {
      throw new BadRequestException("Image size must not exceed 5MB");
    }
  }
}
