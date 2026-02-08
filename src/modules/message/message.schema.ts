import { z } from "zod";

export const listConversationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const createDirectConversationSchema = z.object({
  body: z.object({
    participantId: z.string().trim().min(1),
  }),
});

export const conversationIdSchema = z.object({
  params: z.object({
    conversationId: z.string().trim().min(1),
  }),
});

export const listMessagesSchema = z.object({
  params: z.object({
    conversationId: z.string().trim().min(1),
  }),
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const sendMessageSchema = z.object({
  body: z
    .object({
      conversationId: z.string().trim().min(1),
      text: z.string().trim().max(4000).optional(),
      mediaIds: z.array(z.string().trim().min(1)).optional(),
    })
    .refine((data) => (data.text && data.text.length > 0) || (data.mediaIds && data.mediaIds.length > 0), {
      message: "Message must contain text or media",
    }),
});

export const markConversationReadSchema = z.object({
  body: z.object({
    conversationId: z.string().trim().min(1),
  }),
});

export const typingSchema = z.object({
  body: z.object({
    conversationId: z.string().trim().min(1),
    isTyping: z.boolean(),
  }),
});
