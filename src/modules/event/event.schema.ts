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

const normalizeLocationInput = (value: unknown) => {
  if (value === null || value === undefined || value === "" || value === "null") {
    return undefined;
  }

  const parsed = parseObject(value) as any;
  if (!parsed || typeof parsed !== "object") {
    // Location is optional; ignore malformed non-object values from multipart/mobile clients.
    return undefined;
  }

  if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
    return {
      label: parsed.label,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    };
  }

  if (parsed.lat !== undefined && parsed.lng !== undefined) {
    return {
      label: parsed.label,
      latitude: parsed.lat,
      longitude: parsed.lng,
    };
  }

  if (
    parsed.coordinates
    && typeof parsed.coordinates === "object"
    && parsed.coordinates.latitude !== undefined
    && parsed.coordinates.longitude !== undefined
  ) {
    return {
      label: parsed.label,
      latitude: parsed.coordinates.latitude,
      longitude: parsed.coordinates.longitude,
    };
  }

  if (Array.isArray(parsed.coordinates) && parsed.coordinates.length === 2) {
    return {
      label: parsed.label,
      coordinates: [parsed.coordinates[0], parsed.coordinates[1]],
    };
  }

  // Unknown object shape; ignore instead of failing request.
  return undefined;
};

const nullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "" || value === "null") {
    return undefined;
  }
  return value;
};

const locationSchema = z
  .preprocess(normalizeLocationInput, z.any().optional())
  .transform((value) => {
    if (!value || typeof value !== "object") return undefined;

    const obj = value as any;
    if (Array.isArray(obj.coordinates) && obj.coordinates.length === 2) {
      const lng = Number(obj.coordinates[0]);
      const lat = Number(obj.coordinates[1]);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        return {
          label: obj.label ? String(obj.label) : `${lat},${lng}`,
          coordinates: [lng, lat] as [number, number],
        };
      }
      return undefined;
    }

    if (obj.longitude !== undefined && obj.latitude !== undefined) {
      const lng = Number(obj.longitude);
      const lat = Number(obj.latitude);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        return {
          label: obj.label ? String(obj.label) : `${lat},${lng}`,
          coordinates: [lng, lat] as [number, number],
        };
      }
    }

    return undefined;
  });

export const createEventSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      type: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().max(2000).optional(),
      date: z.coerce.date().optional(),
      startAt: z.coerce.date().optional(),
      endAt: z.coerce.date().optional(),
      country: z.string().trim().min(2).max(100),
      state: z.string().trim().min(1).max(100).optional(),
      city: z.string().trim().min(1).max(100).optional(),
      location: locationSchema,
      participantLimit: z.coerce.number().min(1).optional(),
      mediaIds: z.preprocess(
        parseObject,
        z.array(z.string().trim().min(1)).optional(),
      ),
      status: z
        .enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]])
        .optional(),
      priceType: z.enum(["free", "paid"]).default("free"),
      ticketPrice: z.coerce.number().min(0).optional(),
      discountPercentage: z.preprocess(
        nullableNumber,
        z.coerce.number().min(0).max(100).optional(),
      ),
      durationMinutes: z.coerce.number().int().min(1).optional(),
      currency: z.string().trim().min(3).max(10).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.startAt && data.endAt && data.endAt <= data.startAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endAt"],
          message: "endAt must be after startAt",
        });
      }

      if (data.priceType === "free") {
        if ((data.ticketPrice ?? 0) > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ticketPrice"],
            message: "ticketPrice must be 0 for free events",
          });
        }
      } else if (!data.ticketPrice || data.ticketPrice <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ticketPrice"],
          message: "ticketPrice is required and must be > 0 for paid events",
        });
      }
    }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      type: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().max(2000).optional(),
      date: z.coerce.date().optional(),
      startAt: z.coerce.date().optional(),
      endAt: z.coerce.date().optional(),
      country: z.string().trim().min(2).max(100).optional(),
      state: z.string().trim().min(1).max(100).optional(),
      city: z.string().trim().min(1).max(100).optional(),
      location: locationSchema,
      participantLimit: z.coerce.number().min(1).optional(),
      mediaIds: z.preprocess(
        parseObject,
        z.array(z.string().trim().min(1)).optional(),
      ),
      status: z
        .enum(Object.values(ACTIVITY_STATUS) as [string, ...string[]])
        .optional(),
      priceType: z.enum(["free", "paid"]).optional(),
      ticketPrice: z.coerce.number().min(0).optional(),
      discountPercentage: z.preprocess(
        nullableNumber,
        z.coerce.number().min(0).max(100).optional(),
      ),
      durationMinutes: z.coerce.number().int().min(1).optional(),
      currency: z.string().trim().min(3).max(10).optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.priceType === "free"
        && data.ticketPrice !== undefined
        && data.ticketPrice > 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ticketPrice"],
          message: "ticketPrice must be 0 for free events",
        });
      }

      if (
        data.priceType === "paid"
        && data.ticketPrice !== undefined
        && data.ticketPrice <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ticketPrice"],
          message: "ticketPrice must be > 0 for paid events",
        });
      }

      if (
        data.startAt !== undefined
        && data.endAt !== undefined
        && data.endAt <= data.startAt
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endAt"],
          message: "endAt must be after startAt",
        });
      }
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
    type: z.string().trim().max(100).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    radiusMiles: z.coerce.number().min(0).optional(),
    paid: z.enum(["free", "paid"]).optional(),
    state: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
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
    .default({}),
});

export const messageEventHostSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1),
  }),
  body: z
    .object({
      text: z.string().trim().max(4000).optional(),
    })
    .default({}),
});
