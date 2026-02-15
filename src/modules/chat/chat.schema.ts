import { z } from "zod";

const normalizeHostThreadBody = (value: unknown) => {
  const body = (value || {}) as Record<string, unknown>;

  const targetId =
    body.targetId
    || body.activityId
    || body.eventId
    || undefined;

  const hostUserId =
    body.hostUserId
    || body.hostId
    || undefined;

  return {
    targetId: typeof targetId === "string" ? targetId.trim() : targetId,
    hostUserId: typeof hostUserId === "string" ? hostUserId.trim() : hostUserId,
  };
};

export const createHostThreadSchema = z.object({
  body: z
    .preprocess(
      normalizeHostThreadBody,
      z.object({
        targetId: z.string().min(1).optional(),
        hostUserId: z.string().min(1).optional(),
      }),
    )
    .refine((data) => Boolean(data.targetId || data.hostUserId), {
      message: "Provide targetId or hostUserId",
    }),
});

export const sendThreadMessageSchema = z.object({
  params: z.object({
    threadId: z.string().min(1),
  }),
  body: z.object({
    type: z.enum(["text", "image"]).default("text"),
    text: z.string().trim().max(4000).optional(),
    imageUrl: z.string().trim().url().optional(),
  }).refine((data) => {
    if (data.type === "text") {
      return Boolean(data.text && data.text.trim().length > 0);
    }
    return Boolean(data.imageUrl && data.imageUrl.trim().length > 0);
  }, {
    message: "Invalid message payload for selected message type",
  }),
});

export const listThreadsSchema = z.object({
  query: z.object({}),
});

export const threadIdParamSchema = z.object({
  params: z.object({
    threadId: z.string().min(1),
  }),
});
