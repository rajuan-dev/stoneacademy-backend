// file: src/modules/activity/activity.schema.ts

import { ACTIVITY_STATUS } from "@/constants/app.constants";
import { z } from "zod";

const parseObject = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const createActivitySchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    type: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    location: z.preprocess(
      parseObject,
      z
        .object({
          label: z.string().trim().min(1).max(200),
          coordinates: z.tuple([z.coerce.number(), z.coerce.number()]),
        })
        .optional(),
    ),
    participantLimit: z.coerce.number().min(1).optional(),
    distanceMiles: z.coerce.number().min(0).optional(),
    mediaIds: z.preprocess(
      parseObject,
      z.array(z.string().trim().min(1)).optional(),
    ),
    status: z
      .enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]])
      .optional(),
  }),
});

export const updateActivitySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      type: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().max(2000).optional(),
      startAt: z.coerce.date().optional(),
      endAt: z.coerce.date().optional(),
      location: z.preprocess(
        parseObject,
        z
          .object({
            label: z.string().trim().min(1).max(200),
            coordinates: z.tuple([z.coerce.number(), z.coerce.number()]),
          })
          .optional(),
      ),
      participantLimit: z.coerce.number().min(1).optional(),
      distanceMiles: z.coerce.number().min(0).optional(),
      mediaIds: z.preprocess(
        parseObject,
        z.array(z.string().trim().min(1)).optional(),
      ),
      status: z
        .enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]])
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const activityIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listActivitiesSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    type: z.string().trim().max(100).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    radiusMiles: z.coerce.number().min(0).optional(),
    sort: z.enum(["distance", "time", "popular"]).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});
