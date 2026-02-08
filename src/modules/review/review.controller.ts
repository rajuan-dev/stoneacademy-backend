import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { createReviewSchema, listReviewSchema } from "./review.schema";
import { ReviewService } from "./review.service";

export class ReviewController {
  private service: ReviewService;

  constructor() {
    this.service = new ReviewService();
  }

  create = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createReviewSchema, req);
    const userId = req.user?.userId as string;
    const review = await this.service.create(userId, validated.body);
    ApiResponse.created(res, review, "Review created successfully");
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listReviewSchema, req);
    const result = await this.service.list(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Reviews fetched successfully",
    );
  });
}
