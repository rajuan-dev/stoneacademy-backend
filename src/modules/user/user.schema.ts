import { ACCOUNT_STATUS, GENDERS } from "@/constants/app.constants";
import { z } from "zod";

export const createCleanerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(1).max(200),
    email: z.string().email(),
    cleanerPercentage: z.coerce.number().min(0).max(100),
    phoneNumber: z.string().trim().min(3).max(20).optional(),
    address: z.string().trim().min(1).max(250).optional(),
  }),
});

export const listCleanersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    search: z.string().trim().max(200).optional(),
    status: z.enum(Object.values(ACCOUNT_STATUS) as [string, ...string[]]).optional(),
  }),
});

export const cleanerIdSchema = z.object({
  params: z.object({
    cleanerId: z.string().trim().min(1),
  }),
});

export const updateCleanerSchema = z.object({
  params: z.object({
    cleanerId: z.string().trim().min(1),
  }),
  body: z
    .object({
      fullName: z.string().trim().min(1).max(200).optional(),
      email: z.string().email().optional(),
      phoneNumber: z.string().trim().min(3).max(20).optional(),
      cleanerPercentage: z.coerce.number().min(0).max(100).optional(),
      address: z.string().trim().min(1).max(250).optional(),
      accountStatus: z
        .enum(Object.values(ACCOUNT_STATUS) as [string, ...string[]])
        .optional(),
    })
    .refine(
      (data) =>
        data.fullName ||
        data.email ||
        data.phoneNumber ||
        data.cleanerPercentage !== undefined ||
        data.address ||
        data.accountStatus,
      { message: "At least one field must be provided for update" }
    ),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(1).max(200).optional(),
      email: z.string().email().optional(),
      phone: z.string().trim().min(3).max(20).optional(),
      dob: z.coerce.date().optional(),
      gender: z
        .enum(Object.values(GENDERS) as [string, ...string[]])
        .optional(),
      location: z
        .object({
          label: z.string().trim().min(1).max(200).optional(),
          coordinates: z
            .object({
              type: z.literal("Point").optional(),
              coordinates: z.tuple([z.number(), z.number()]),
            })
            .optional(),
        })
        .optional(),
    })
    .refine(
      (data) =>
        data.fullName ||
        data.email ||
        data.phone ||
        data.dob ||
        data.gender ||
        data.location,
      { message: "At least one field must be provided for update" }
    ),
});

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const galleryRemoveSchema = z.object({
  params: z.object({
    mediaId: z.string().trim().min(1),
  }),
});
