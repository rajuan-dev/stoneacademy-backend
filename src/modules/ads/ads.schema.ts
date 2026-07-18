import { z } from "zod";

export const listAdsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    status: z.enum(["active", "expired"]).optional(),
  }),
});

export const listActiveAdsSchema = z.object({
  query: z.object({
    state: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
  }),
});

export const adIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const createAdSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    price: z.coerce.number().min(0).optional(),
    imageUrl: z.string().trim().url().max(2000).optional(),
    linkUrl: z.string().trim().min(1).max(2000),
    country: z.string().trim().min(2).max(100),
    state: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["active", "expired"]).optional(),
  }),
});

export const migrateShopProductsSchema = z.object({
  body: z.object({
    country: z.string().trim().min(2).max(100),
    state: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["active", "expired"]).optional(),
    onlyActive: z.coerce.boolean().optional(),
    deleteSource: z.coerce.boolean().optional(),
  }),
});

export const updateAdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    price: z.coerce.number().min(0).optional(),
    imageUrl: z.string().trim().url().max(2000).optional(),
    linkUrl: z.string().trim().min(1).max(2000).optional(),
    country: z.string().trim().min(2).max(100).optional(),
    state: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["active", "expired"]).optional(),
  }),
});
