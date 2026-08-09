import { PAGINATION } from "@/constants/app.constants";
import { Types } from "mongoose";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid ObjectId",
  });

const parseObject = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseStringArray = (value: unknown) => {
  if (value === undefined || value === null || value === "" || value === "null") {
    return undefined;
  }
  const parsed = parseObject(value);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "string") return [parsed];
  return parsed;
};

const parseObjectIdArray = (value: unknown) => {
  const parsed = parseStringArray(value);
  if (parsed === undefined) return undefined;
  return Array.isArray(parsed) ? parsed : [parsed];
};

const nullableObjectIdSchema = z.preprocess(
  (value) => (value === "" || value === "null" ? null : value),
  objectIdSchema.nullable().optional(),
);

const optionalObjectIdSchema = z.preprocess(
  (value) => (value === "" || value === "null" || value === null ? undefined : value),
  objectIdSchema.optional(),
);

const nullableObjectIdArraySchema = z.preprocess(
  (value) => {
    if (value === "" || value === "null" || value === null) return null;
    return parseObjectIdArray(value);
  },
  z.array(objectIdSchema).nullable().optional(),
);

const pageLimitSchema = z.object({
  page: z.coerce.number().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
});

export const listCommunityPostsSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    page: pageLimitSchema.shape.page,
    limit: pageLimitSchema.shape.limit,
  }),
});

export const communityPostIdSchema = z.object({
  params: z.object({
    postId: objectIdSchema,
  }),
});

export const communityCommentIdSchema = z.object({
  params: z.object({
    commentId: objectIdSchema,
  }),
});

const commentBodySchema = z
  .object({
    text: z.string().trim().max(4000).optional(),
    eventId: optionalObjectIdSchema,
    activityId: optionalObjectIdSchema,
  })
  .superRefine((data, ctx) => {
    if (data.eventId && data.activityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activityId"],
        message: "eventId and activityId cannot both be supplied",
      });
    }

    if (!data.text && !data.eventId && !data.activityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["text"],
        message: "Comment must include text, eventId, or activityId",
      });
    }
  });

export const createCommunityCommentSchema = z.object({
  params: z.object({
    postId: objectIdSchema,
  }),
  body: commentBodySchema,
});

export const createCommunityReplySchema = z.object({
  params: z.object({
    commentId: objectIdSchema,
  }),
  body: commentBodySchema,
});

export const listCommunityCommentsSchema = z.object({
  params: z.object({
    postId: objectIdSchema,
  }),
  query: pageLimitSchema,
});

export const listCommunityRepliesSchema = z.object({
  params: z.object({
    commentId: objectIdSchema,
  }),
  query: pageLimitSchema,
});

export const updateCommunityPostSchema = z.object({
  params: z.object({
    postId: objectIdSchema,
  }),
  body: z
    .object({
      text: z.string().trim().max(2000).nullable().optional(),
      mediaIds: z.preprocess(
        parseStringArray,
        z.array(objectIdSchema).nullable().optional(),
      ),
      location: z.preprocess(parseObject, z.any().nullable().optional()),
      eventId: nullableObjectIdSchema,
      eventIds: nullableObjectIdArraySchema,
      activityId: nullableObjectIdSchema,
      activityIds: nullableObjectIdArraySchema,
      link: z.string().trim().url().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    })
    .superRefine((data, ctx) => {
      const eventIds = [
        ...(data.eventId ? [data.eventId] : []),
        ...(data.eventIds ?? []),
      ];
      const activityIds = [
        ...(data.activityId ? [data.activityId] : []),
        ...(data.activityIds ?? []),
      ];

      if (eventIds.length && activityIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["activityId"],
          message: "eventId/eventIds and activityId/activityIds cannot both be supplied",
        });
      }
    }),
});

export const reportCommunityPostSchema = z.object({
  params: z.object({
    postId: objectIdSchema,
  }),
  body: z.object({
    reason: z.union([
      z.enum([
        "spam",
        "unprofessional_behavior",
        "harassment",
        "inappropriate_content",
        "other",
      ]),
      z.string().trim().min(3).max(250),
    ]),
    details: z.string().trim().max(3000).optional(),
  }),
});
