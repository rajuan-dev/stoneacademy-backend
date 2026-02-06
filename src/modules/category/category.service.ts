// file: src/modules/category/category.service.ts

import { BadRequestException, NotFoundException } from "@/utils/app-error.utils";
import { Category, type ICategory } from "./category.model";

export class CategoryService {
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
      category.name = payload.name.trim();
    }
    if (payload.isActive !== undefined) {
      category.isActive = payload.isActive;
    }

    await category.save();
    return category;
  }

  async delete(id: string) {
    const category = await Category.findByIdAndDelete(id).exec();
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    return category;
  }
}
