import { z } from "zod";

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    type: z.string().trim().max(100).optional(),
    isRead: z
      .preprocess((value) => {
        if (value === undefined || value === null || value === "") return undefined;
        if (typeof value === "boolean") return value;
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      }, z.boolean().optional()),
    entityType: z.string().trim().max(50).optional(),
    entityId: z.string().trim().min(1).optional(),
  }),
});

export const notificationIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const updateNotificationPreferencesSchema = z.object({
  body: z
    .object({
      activityJoined: z.boolean().optional(),
      activityLeft: z.boolean().optional(),
      activityUpdated: z.boolean().optional(),
      activityCancelled: z.boolean().optional(),
      eventJoined: z.boolean().optional(),
      eventLeft: z.boolean().optional(),
      eventUpdated: z.boolean().optional(),
      eventCancelled: z.boolean().optional(),
      messages: z.boolean().optional(),
      reviews: z.boolean().optional(),
      support: z.boolean().optional(),
      payouts: z.boolean().optional(),
      reportStatusUpdated: z.boolean().optional(),
      reportModeration: z.boolean().optional(),
      contentReported: z.boolean().optional(),
      system: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one preference must be provided",
    }),
});
