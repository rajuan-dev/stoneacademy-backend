// file: src/modules/admin-auth/admin-auth.schema.ts

import { z } from "zod";

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export const adminProfileUpdateSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(6).max(20).optional(),
    contactNo: z.string().min(6).max(20).optional(),
  }),
});

export const adminChangePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8),
    newPassword: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
        "Password must include uppercase, lowercase, number, and special character",
      ),
  }),
});

export const adminLogoutSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().min(10).optional(),
    })
    .optional(),
});
