import { z } from "zod";

export const listFeedSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    typeCategoryId: z.string().trim().min(1).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    radiusMiles: z.coerce.number().min(0).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});
