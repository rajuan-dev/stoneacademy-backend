// file: src/modules/category/category.service.ts

import { BadRequestException, NotFoundException } from "@/utils/app-error.utils";
import { PAGINATION } from "@/constants/app.constants";
import { Category, type ICategory } from "./category.model";
import { Activity } from "../activity/activity.model";
import { Event } from "../event/event.model";

export class CategoryService {
  private static readonly ADMIN_ROW_ID_PAD = 2;

  async list(activeOnly?: boolean): Promise<ICategory[]> {
    const filter: Record<string, any> = {};
    if (activeOnly) {
      filter.isActive = true;
    }
    return Category.find(filter).sort({ name: 1 }).exec();
  }

  async create(payload: { name: string; isActive?: boolean }) {
    const existing = await Category.findOne({
      name: payload.name.trim(),
    }).exec();
    if (existing) {
      throw new BadRequestException("Category already exists");
    }

    return Category.create({
      name: payload.name.trim(),
      isActive: payload.isActive ?? true,
    });
  }

  async update(
    id: string,
    payload: { name?: string; isActive?: boolean },
  ) {
    const category = await Category.findById(id).exec();
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    if (payload.name !== undefined) {
      const duplicate = await Category.findOne({
        name: payload.name.trim(),
        _id: { $ne: id },
      }).exec();
      if (duplicate) {
        throw new BadRequestException("Category already exists");
      }
      category.name = payload.name.trim();
    }
    if (payload.isActive !== undefined) {
      category.isActive = payload.isActive;
    }

    await category.save();
    return category;
  }

  async delete(id: string) {
    const activityCount = await Activity.countDocuments({
      typeCategoryId: id,
    });
    const eventCount = await Event.countDocuments({
      typeCategoryId: id,
    });
    if (activityCount > 0 || eventCount > 0) {
      throw new BadRequestException("Category is in use and cannot be deleted");
    }

    const category = await Category.findByIdAndDelete(id).exec();
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    return category;
  }

  async listAdmin(query: {
    q?: string;
    page?: number;
    limit?: number;
    active?: boolean;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.q) {
      filter.name = new RegExp(query.q, "i");
    }
    if (query.active !== undefined) {
      filter.isActive = query.active;
    }

    const [categories, totalItems] = await Promise.all([
      Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Category.countDocuments(filter),
    ]);

    const data = categories.map((category, index) => {
      const rowNumber = totalItems - ((page - 1) * limit + index);
      return {
        id: category._id,
        serialId: String(Math.max(rowNumber, 0)).padStart(
          CategoryService.ADMIN_ROW_ID_PAD,
          "0",
        ),
        categoryName: category.name,
        isActive: category.isActive,
        action: {
          canEdit: true,
          canDelete: true,
        },
      };
    });

    return {
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }
}
