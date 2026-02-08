import { ACTIVITY_STATUS } from "@/constants/app.constants";
import { z } from "zod";

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200),
    typeCategoryId: z.string().trim().min(1),
    description: z.string().trim().max(2000).optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date().optional(),
    location: z
      .object({
        label: z.string().trim().min(1).max(200),
        coordinates: z.tuple([z.number(), z.number()]),
      })
      .optional(),
    participantLimit: z.coerce.number().min(1).optional(),
    mediaIds: z.array(z.string().trim().min(1)).optional(),
    status: z
      .enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]])
      .optional(),
    ticketPrice: z.coerce.number().min(0),
    currency: z.string().trim().min(3).max(10).optional(),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      typeCategoryId: z.string().trim().min(1).optional(),
      description: z.string().trim().max(2000).optional(),
      startAt: z.coerce.date().optional(),
      endAt: z.coerce.date().optional(),
      location: z
        .object({
          label: z.string().trim().min(1).max(200),
          coordinates: z.tuple([z.number(), z.number()]),
        })
        .optional(),
      participantLimit: z.coerce.number().min(1).optional(),
      mediaIds: z.array(z.string().trim().min(1)).optional(),
      status: z
        .enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]])
        .optional(),
      ticketPrice: z.coerce.number().min(0).optional(),
      currency: z.string().trim().min(3).max(10).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

export const eventIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
});

export const listEventsSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),
    typeCategoryId: z.string().trim().min(1).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    radiusMiles: z.coerce.number().min(0).optional(),
    paid: z.enum(["free", "paid"]).optional(),
    sort: z.enum(["distance", "time", "popular"]).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const joinEventSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      providerReference: z.string().trim().min(1).max(200).optional(),
    })
    .optional(),
});
