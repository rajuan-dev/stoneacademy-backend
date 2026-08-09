import { Types } from "mongoose";
import { z } from "zod";

const parseObject = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const parseStringArray = (value: unknown) => {
  if (value === undefined || value === null || value === "" || value === "null") {
    return undefined;
  }

  const parsed = parseObject(value);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (typeof parsed === "string") {
    return [parsed];
  }
  return parsed;
};

const parseObjectIdArray = (value: unknown) => {
  const parsed = parseStringArray(value);
  if (parsed === undefined) {
    return undefined;
  }
  return Array.isArray(parsed) ? parsed : [parsed];
};

const objectIdSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid ObjectId",
  });

const normalizeLocationInput = (value: unknown) => {
  if (value === null || value === undefined || value === "" || value === "null") {
    return undefined;
  }

  return parseObject(value);
};

const coordinateTupleSchema = z.tuple([
  z.coerce.number().min(-180).max(180),
  z.coerce.number().min(-90).max(90),
]);

const latLngLocationSchema = z.object({
  label: z.string().trim().min(1).max(300).optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

const coordinatesLocationSchema = z.object({
  label: z.string().trim().min(1).max(300).optional(),
  coordinates: coordinateTupleSchema,
});

const locationSchema = z
  .preprocess(
    normalizeLocationInput,
    z.union([latLngLocationSchema, coordinatesLocationSchema]).optional(),
  )
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    if ("coordinates" in value) {
      const [longitude, latitude] = value.coordinates;
      return {
        label: value.label || `${latitude},${longitude}`,
        coordinates: [longitude, latitude] as [number, number],
      };
    }

    return {
      label: value.label || `${value.latitude},${value.longitude}`,
      coordinates: [value.longitude, value.latitude] as [number, number],
    };
  });

export const createCommunityPostSchema = z.object({
  body: z
    .object({
      text: z.string().trim().max(2000).optional(),
      mediaIds: z.preprocess(
        parseStringArray,
        z.array(objectIdSchema).optional(),
      ),
      location: locationSchema,
      eventId: z.preprocess(parseObjectIdArray, z.array(objectIdSchema).optional()),
      eventIds: z.preprocess(parseObjectIdArray, z.array(objectIdSchema).optional()),
      activityId: z.preprocess(parseObjectIdArray, z.array(objectIdSchema).optional()),
      activityIds: z.preprocess(parseObjectIdArray, z.array(objectIdSchema).optional()),
      link: z.string().trim().url().optional(),
    })
    .superRefine((data, ctx) => {
      const eventIds = [
        ...(data.eventId ?? []),
        ...(data.eventIds ?? []),
      ];
      const activityIds = [
        ...(data.activityId ?? []),
        ...(data.activityIds ?? []),
      ];

      if (eventIds.length && activityIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["activityId"],
          message: "eventId/eventIds and activityId/activityIds cannot both be supplied",
        });
      }
    }),
});
