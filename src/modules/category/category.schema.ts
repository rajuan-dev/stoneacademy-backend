// file: src/modules/category/category.schema.ts

import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    isActive: z.boolean().optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => data.name !== undefined || data.isActive !== undefined, {
      message: "At least one field must be provided",
    }),
});

export const categoryIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listCategoriesSchema = z.object({
  query: z.object({
    activeOnly: z.coerce.boolean().optional(),
  }),
});
