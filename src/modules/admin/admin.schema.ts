import { ROLES, USER_STATUS } from "@/constants/app.constants";
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
