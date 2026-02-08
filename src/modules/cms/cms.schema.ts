import { z } from "zod";

export const listCmsPagesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const cmsSlugSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1).max(200),
  }),
});

export const createCmsPageSchema = z.object({
  body: z.object({
    slug: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(20000),
  }),
});

export const updateCmsPageSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1).max(200),
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      content: z.string().trim().min(1).max(20000).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});
