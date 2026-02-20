import { ACTIVITY_STATUS, ROLES, USER_STATUS } from "@/constants/app.constants";
import { z } from "zod";

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    search: z.string().trim().max(200).optional(),
    role: z.enum(Object.values(ROLES) as [string, ...string[]]).optional(),
    status: z.enum(Object.values(USER_STATUS) as [string, ...string[]]).optional(),
  }),
});

export const listBlockedUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    search: z.string().trim().max(200).optional(),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1).max(200),
    limit: z.coerce.number().min(1).max(50).optional(),
    role: z.enum(Object.values(ROLES) as [string, ...string[]]).optional(),
    status: z.enum(Object.values(USER_STATUS) as [string, ...string[]]).optional(),
  }),
});

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    status: z.enum(Object.values(USER_STATUS) as [string, ...string[]]),
    reason: z.string().trim().max(500).optional(),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    role: z.enum(Object.values(ROLES) as [string, ...string[]]),
  }),
});

export const blockUserSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    reason: z.string().trim().min(3).max(500).optional(),
  }),
});

export const unblockUserSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listActivitiesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    q: z.string().trim().max(200).optional(),
    status: z
      .enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]])
      .optional(),
  }),
});

export const listEventsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    q: z.string().trim().max(200).optional(),
    status: z
      .enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]])
      .optional(),
  }),
});

export const updateActivityStatusSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    status: z.enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]]),
  }),
});

export const updateEventStatusSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    status: z.enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]]),
  }),
});

export const listSubscriptionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    status: z.string().trim().optional(),
    plan: z.string().trim().optional(),
    search: z.string().trim().max(200).optional(),
  }),
});

export const updateSubscriptionFeesSchema = z.object({
  body: z.object({
    subscriptionMonthlyPrice: z.coerce.number().min(0).optional(),
    subscriptionYearlyPrice: z.coerce.number().min(0).optional(),
  }),
});

export const listPremiumCreatorsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    q: z.string().trim().max(200).optional(),
    paymentStatus: z.enum(["pending", "complete", "all"]).optional(),
  }),
});

export const dashboardAnalyticsSchema = z.object({
  query: z.object({
    year: z.coerce.number().int().min(1970).max(9999).optional(),
  }),
});

export const updateAdminProfileSchema = z.object({
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
