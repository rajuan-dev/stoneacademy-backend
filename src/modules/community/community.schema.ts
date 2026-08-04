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

const commentBodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
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
