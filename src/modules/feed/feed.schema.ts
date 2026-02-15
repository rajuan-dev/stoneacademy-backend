import { z } from "zod";

export const listFeedSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const searchFilterSchema = z.object({
  query: z.object({
    kind: z.enum(["all", "activity", "event"]).optional(),
    type: z.string().trim().max(100).optional(),
    date: z.coerce.date().optional(),
    paid: z.enum(["all", "free", "paid"]).optional(),
  }),
});
