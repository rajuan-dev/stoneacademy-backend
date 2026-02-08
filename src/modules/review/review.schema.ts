import { z } from "zod";

export const createReviewSchema = z.object({
  body: z.object({
    targetType: z.enum(["activity", "event"]),
    targetId: z.string().trim().min(1),
    rating: z.coerce.number().min(1).max(5),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    comment: z.string().trim().max(2000).optional(),
  }),
});

export const listReviewSchema = z.object({
  query: z.object({
    targetUserId: z.string().trim().min(1).optional(),
    targetType: z.enum(["activity", "event"]).optional(),
    targetId: z.string().trim().min(1).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});
