import { z } from "zod";

export const listBillingSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    status: z.enum(["pending", "succeeded", "failed", "refunded"]).optional(),
  }),
});

export const createPayoutRequestSchema = z.object({
  body: z.object({
    amount: z.coerce.number().min(0.01),
    currency: z.string().trim().min(3).max(10).optional(),
    note: z.string().trim().max(2000).optional(),
  }),
});

export const createSelfWithdrawalSchema = z.object({
  body: z.object({
    amount: z.coerce.number().min(0.01).optional(),
    currency: z.string().trim().min(3).max(10).optional(),
    note: z.string().trim().max(2000).optional(),
  }),
});

export const payoutRequestIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const updatePayoutStatusSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    status: z.enum(["approved", "rejected", "paid"]),
    note: z.string().trim().max(2000).optional(),
  }),
});
