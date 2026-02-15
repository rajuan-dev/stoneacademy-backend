import { z } from "zod";

const normalizeTag = (value: unknown) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

  const aliases: Record<string, string> = {
    fiendly: "friendly",
    on_time: "ontime",
    motivationg: "motivating",
    disrespectfull: "disrespectful",
    notpunctual: "not_punctual",
  };

  return aliases[normalized] || normalized;
};

const quickFeedbackTag = z.preprocess(
  normalizeTag,
  z.enum([
    "friendly",
    "ontime",
    "motivating",
    "professional",
    "not_punctual",
    "disrespectful",
  ]),
);

export const createReviewSchema = z.object({
  body: z.object({
    targetType: z.enum(["activity", "event"]),
    targetId: z.string().trim().min(1),
    rating: z.coerce.number().min(1).max(5),
    tags: z.array(quickFeedbackTag).max(20).optional(),
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
