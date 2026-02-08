import { z } from "zod";

export const listAdminNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const adminNotificationIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});
