import { z } from "zod";

export const updatePlatformSettingsSchema = z.object({
  body: z.object({
    platformFeePercent: z.coerce.number().min(0).max(100).optional(),
    cancellationPolicy: z.string().trim().max(5000).optional(),
    refundPolicy: z.string().trim().max(5000).optional(),
    reminderMinutes: z.coerce.number().min(1).max(1440).optional(),
  }),
});
