import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { listFeedSchema, searchFilterSchema } from "./feed.schema";
import { FeedService } from "./feed.service";

export class FeedController {
  private service: FeedService;

  constructor() {
    this.service = new FeedService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listFeedSchema, req);
    const result = await this.service.list(validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Feed fetched");
  });

  searchFilter = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(searchFilterSchema, req);
    const result = await this.service.searchFilter(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Search filter results fetched",
    );
  });
}
