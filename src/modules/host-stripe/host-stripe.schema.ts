import { z } from "zod";

export const createStripeAccountSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional(),
    })
    .optional(),
});

export const createOnboardingLinkSchema = z.object({
  body: z
    .object({
      refreshUrl: z.string().url().optional(),
      returnUrl: z.string().url().optional(),
    })
    .optional(),
});
