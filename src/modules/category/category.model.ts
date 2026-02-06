// file: src/modules/category/category.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model } from "mongoose";

export interface ICategory {
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = BaseSchemaUtil.createSchema<ICategory>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
});

export const Category = model<ICategory>("Category", categorySchema);
