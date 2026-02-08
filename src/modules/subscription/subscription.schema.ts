import { z } from "zod";

export const activateSubscriptionSchema = z.object({
  body: z.object({
    plan: z.enum(["monthly", "yearly"]),
    paymentProvider: z.string().trim().min(1).max(100).optional(),
    externalSubscriptionId: z.string().trim().min(1).max(200).optional(),
  }),
});
