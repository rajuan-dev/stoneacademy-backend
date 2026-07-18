import { z } from "zod";

export const listFeedSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    category: z.string().trim().max(100).optional(),
    type: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
    paid: z.enum(["all", "free", "paid"]).optional(),
    sort: z.enum(["distance", "time", "popular", "recent"]).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().positive().optional(),
    radiusUnit: z.enum(["km", "mile", "miles"]).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const searchFilterSchema = z.object({
  query: z.object({
    kind: z.enum(["all", "activity", "event", "ad"]).optional(),
    category: z.string().trim().max(100).optional(),
    type: z.string().trim().max(100).optional(),
    date: z.coerce.date().optional(),
    paid: z.enum(["all", "free", "paid"]).optional(),
    state: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
    sort: z.enum(["distance", "time", "popular", "recent"]).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().positive().optional(),
    radiusUnit: z.enum(["km", "mile", "miles"]).optional(),
  }),
});
