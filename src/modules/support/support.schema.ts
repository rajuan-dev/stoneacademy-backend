import { z } from "zod";

export const createTicketSchema = z.object({
  body: z.object({
    category: z.string().trim().min(1).max(120),
    subject: z.string().trim().min(3).max(250),
    message: z.string().trim().min(3).max(4000),
  }),
});

export const listTicketSchema = z.object({
  query: z.object({
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const ticketIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const addReplySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    message: z.string().trim().min(1).max(4000),
  }),
});

export const updateTicketStatusSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    status: z.enum(["open", "in_progress", "resolved", "closed"]),
  }),
});
