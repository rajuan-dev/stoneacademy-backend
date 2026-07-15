import { z } from "zod";

export const listAdsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    status: z.enum(["active", "expired"]).optional(),
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
    imageUrl: z.string().trim().min(1).max(2000),
    linkUrl: z.string().trim().min(1).max(2000),
    country: z.string().trim().min(2).max(100),
    state: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["active", "expired"]).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    order: z.coerce.number().min(0).optional(),
  }),
});

export const updateAdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      name: z.string().trim().min(1).max(200).optional(),
      imageUrl: z.string().trim().min(1).max(2000).optional(),
      linkUrl: z.string().trim().min(1).max(2000).optional(),
      country: z.string().trim().min(2).max(100).optional(),
      state: z.string().trim().min(1).max(100).optional(),
      city: z.string().trim().min(1).max(100).optional(),
      status: z.enum(["active", "expired"]).optional(),
      startsAt: z.coerce.date().optional(),
      endsAt: z.coerce.date().optional(),
      order: z.coerce.number().min(0).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});
