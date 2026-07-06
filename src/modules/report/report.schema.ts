import { z } from "zod";

const reasonEnum = z.enum([
  "spam",
  "unprofessional_behavior",
  "harassment",
  "inappropriate_content",
  "other",
]);

export const createReportSchema = z.object({
  body: z.object({
    entityType: z.enum(["user", "activity", "event", "message"]),
    entityId: z.string().trim().min(1),
    reason: z.union([reasonEnum, z.string().trim().min(3).max(250)]),
    details: z.string().trim().max(3000).optional(),
  }),
});

export const listReportSchema = z.object({
  query: z.object({
    status: z.enum(["open", "under_review", "resolved", "rejected"]).optional(),
    entityType: z.enum(["user", "activity", "event", "message"]).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const updateReportStatusSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    status: z.enum(["under_review", "resolved", "rejected"]),
    adminNote: z.string().trim().max(3000).optional(),
    }),
});

export const reportIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const adminResolveReportSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      status: z.enum(["resolved", "under_review", "closed"]).optional(),
      adminNote: z.string().trim().max(3000).optional(),
      resolutionNotes: z.string().trim().max(3000).optional(),
    })
    .optional()
    .default({}),
});

export const adminDismissReportSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      adminNote: z.string().trim().max(3000).optional(),
      dismissalReason: z.string().trim().max(3000).optional(),
    })
    .optional()
    .default({}),
});

export const adminReportActionSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z.object({
    action: z.enum(["warn", "disable_user", "recover_user"]),
    note: z.string().trim().max(3000).optional(),
  }),
});
