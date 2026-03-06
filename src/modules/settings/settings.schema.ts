import { z } from "zod";

export const updatePlatformSettingsSchema = z.object({
  body: z.object({
    platformFeePercent: z.coerce.number().min(0).max(100).optional(),
    cancellationPolicy: z.string().trim().max(5000).optional(),
    refundPolicy: z.string().trim().max(5000).optional(),
    reminderMinutes: z.coerce.number().min(1).max(1440).optional(),
    subscriptionMonthlyPrice: z.coerce.number().min(0).optional(),
    subscriptionYearlyPrice: z.coerce.number().min(0).optional(),
  }),
});

export const updateSettingsProfileSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(1).max(200).optional(),
      email: z.string().email().optional(),
      phone: z.string().trim().min(3).max(20).optional(),
      contactNo: z.string().trim().min(3).max(20).optional(),
      phoneNumber: z.string().trim().min(3).max(20).optional(),
    })
    .refine(
      (data) =>
        data.fullName
        || data.email
        || data.phone
        || data.contactNo
        || data.phoneNumber,
      { message: "At least one field must be provided for update" },
    ),
});

export const updateSettingsSecuritySchema = z.object({
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
