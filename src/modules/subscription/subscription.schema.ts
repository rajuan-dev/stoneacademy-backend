import { z } from "zod";

export const createSubscriptionCheckoutIntentSchema = z.object({
  body: z.object({
    plan: z.enum(["monthly", "yearly"]),
  }),
});

export const confirmSubscriptionPaymentSchema = z.object({
  body: z.object({
    paymentIntentId: z.string().trim().min(1).max(200),
  }),
});
