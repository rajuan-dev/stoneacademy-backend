import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { AdsService } from "./ads.service";
import { adIdSchema, createAdSchema, listAdsSchema, updateAdSchema } from "./ads.schema";

export class AdsController {
  private service: AdsService;

  constructor() {
    this.service = new AdsService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listAdsSchema, req);
    const result = await this.service.list(validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Ads fetched");
  });

  listActive = asyncHandler(async (_req: Request, res: Response) => {
    const ads = await this.service.listActive();
    ApiResponse.success(res, ads, "Active ads fetched");
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createAdSchema, req);
    const ad = await this.service.create(validated.body);
    ApiResponse.created(res, ad, "Ad created");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateAdSchema, req);
    const ad = await this.service.update(validated.params.id, validated.body);
    ApiResponse.success(res, ad, "Ad updated");
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(adIdSchema, req);
    const result = await this.service.remove(validated.params.id);
    ApiResponse.success(res, result, "Ad deleted");
  });
}
