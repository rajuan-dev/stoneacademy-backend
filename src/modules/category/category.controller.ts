// file: src/modules/category/category.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  categoryIdSchema,
  createCategorySchema,
  listCategoriesSchema,
  updateCategorySchema,
} from "./category.schema";
import { CategoryService } from "./category.service";

export class CategoryController {
  private service: CategoryService;

  constructor() {
    this.service = new CategoryService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listCategoriesSchema, req);
    const categories = await this.service.list(validated.query.activeOnly);
    ApiResponse.success(res, categories, "Categories fetched successfully");
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createCategorySchema, req);
    const category = await this.service.create(validated.body);
    ApiResponse.created(res, category, "Category created successfully");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateCategorySchema, req);
    const category = await this.service.update(
      validated.params.id,
      validated.body,
    );
    ApiResponse.success(res, category, "Category updated successfully");
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(categoryIdSchema, req);
    const category = await this.service.delete(validated.params.id);
    ApiResponse.success(res, category, "Category deleted successfully");
  });
}
