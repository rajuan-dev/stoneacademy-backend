// file: src/modules/activity/activity.service.ts

import { ACTIVITY_STATUS, PARTICIPANT_STATUS } from "@/constants/app.constants";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import jwt from "jsonwebtoken";
import type { FilterQuery } from "mongoose";
import { Activity } from "./activity.model";
import { ActivityParticipant } from "./activity-participant.model";
import { QrToken } from "./qr-token.model";

type ListQuery = {
  q?: string;
  typeCategoryId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  sort?: "distance" | "time" | "popular";
  page?: number;
  limit?: number;
};

const MILES_TO_METERS = 1609.34;

export class ActivityService {
  async list(query: ListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<any> = {};

    if (query.q) {
      const pattern = new RegExp(query.q, "i");
      filter.$or = [{ title: pattern }, { description: pattern }];
    }

    if (query.typeCategoryId) {
      filter.typeCategoryId = query.typeCategoryId;
    }

    if (query.dateFrom || query.dateTo) {
      filter.startAt = {};
      if (query.dateFrom) {
        filter.startAt.$gte = query.dateFrom;
      }
      if (query.dateTo) {
        filter.startAt.$lte = query.dateTo;
      }
    }

    const hasGeo = query.lat !== undefined && query.lng !== undefined;
    if (hasGeo) {
      const maxDistance =
        query.radiusMiles !== undefined
          ? query.radiusMiles * MILES_TO_METERS
          : undefined;

      filter["location.coordinates"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [query.lng, query.lat],
          },
          ...(maxDistance ? { $maxDistance: maxDistance } : {}),
        },
      };
    }

    let sort: Record<string, any> | undefined = { startAt: 1 };
    if (query.sort === "popular") {
      sort = { "stats.joinedCount": -1, startAt: 1 };
    } else if (query.sort === "time") {
      sort = { startAt: 1 };
    } else if (hasGeo) {
      sort = undefined;
    }

    const queryBuilder = Activity.find(filter);
    if (sort) {
      queryBuilder.sort(sort);
    }

    const [data, totalItems] = await Promise.all([
      queryBuilder.skip(skip).limit(limit).exec(),
      Activity.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  async create(payload: {
    hostId: string;
    title: string;
    typeCategoryId: string;
    description?: string;
    startAt: Date;
    endAt?: Date;
    location?: { label: string; coordinates: [number, number] };
    participantLimit?: number;
    distanceMiles?: number;
    mediaIds?: string[];
    status?: string;
  }) {
    if (payload.startAt < new Date()) {
      throw new BadRequestException("Start time must be in the future");
    }

    return Activity.create({
      hostId: payload.hostId,
      title: payload.title,
      typeCategoryId: payload.typeCategoryId,
      description: payload.description,
      startAt: payload.startAt,
      endAt: payload.endAt,
      location: payload.location
        ? {
            label: payload.location.label,
            coordinates: {
              type: "Point",
              coordinates: payload.location.coordinates,
            },
          }
        : undefined,
      participantLimit: payload.participantLimit,
      distanceMiles: payload.distanceMiles,
      media: payload.mediaIds || [],
      status: payload.status || ACTIVITY_STATUS.DRAFT,
      stats: { joinedCount: 0 },
    });
  }

  async getById(activityId: string) {
    const activity = await Activity.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException("Activity not found");
    }
    return activity;
  }

  async update(
    activityId: string,
    userId: string,
    payload: {
      title?: string;
      typeCategoryId?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
      location?: { label: string; coordinates: [number, number] };
      participantLimit?: number;
      distanceMiles?: number;
      mediaIds?: string[];
      status?: string;
    },
  ) {
    const activity = await this.getById(activityId);

    if (activity.hostId.toString() !== userId) {
      throw new ForbiddenException("Only host can edit this activity");
    }

    if (payload.title !== undefined) activity.title = payload.title;
    if (payload.typeCategoryId !== undefined)
      activity.typeCategoryId = payload.typeCategoryId as any;
    if (payload.description !== undefined)
      activity.description = payload.description;
    if (payload.startAt !== undefined) activity.startAt = payload.startAt;
    if (payload.endAt !== undefined) activity.endAt = payload.endAt;
    if (payload.location !== undefined) {
      activity.location = {
        label: payload.location.label,
        coordinates: {
          type: "Point",
          coordinates: payload.location.coordinates,
        },
      };
    }
    if (payload.participantLimit !== undefined)
      activity.participantLimit = payload.participantLimit;
    if (payload.distanceMiles !== undefined)
      activity.distanceMiles = payload.distanceMiles;
    if (payload.mediaIds !== undefined) activity.media = payload.mediaIds as any;
    if (payload.status !== undefined)
      activity.status = payload.status as any;

    await activity.save();
    return activity;
  }

  async remove(activityId: string, userId: string) {
    const activity = await this.getById(activityId);
    if (activity.hostId.toString() !== userId) {
      throw new ForbiddenException("Only host can delete this activity");
    }

    activity.status = ACTIVITY_STATUS.CANCELLED;
    await activity.save();

    await ActivityParticipant.updateMany(
      { activityId: activity._id, status: PARTICIPANT_STATUS.JOINED },
      { status: PARTICIPANT_STATUS.CANCELLED },
    ).exec();

    return activity;
  }

  async join(activityId: string, userId: string) {
    const activity = await this.getById(activityId);

    if (activity.status === ACTIVITY_STATUS.CANCELLED) {
      throw new BadRequestException("Activity is cancelled");
    }

    if (activity.startAt < new Date()) {
      throw new BadRequestException("Activity already started");
    }

    const existing = await ActivityParticipant.findOne({
      activityId: activity._id,
      userId,
    }).exec();

    if (existing && existing.status === PARTICIPANT_STATUS.JOINED) {
      throw new BadRequestException("Already joined");
    }

    const joinedCount = await ActivityParticipant.countDocuments({
      activityId: activity._id,
      status: PARTICIPANT_STATUS.JOINED,
    });

    if (
      activity.participantLimit &&
      joinedCount >= activity.participantLimit
    ) {
      throw new BadRequestException("Activity is full");
    }

    const participant =
      existing ||
      new ActivityParticipant({
        activityId: activity._id,
        userId,
      });

    participant.status = PARTICIPANT_STATUS.JOINED;
    participant.joinedAt = new Date();

    if (!participant.qrTokenId) {
      const payload = this.generateQrPayload(participant._id.toString());
      const qrToken = await QrToken.create({
        kind: "activity",
        participantId: participant._id,
        payload,
      });
      participant.qrTokenId = qrToken._id;
    }

    await participant.save();

    const updatedCount = await ActivityParticipant.countDocuments({
      activityId: activity._id,
      status: PARTICIPANT_STATUS.JOINED,
    });
    activity.stats = { joinedCount: updatedCount };
    await activity.save();

    return participant;
  }

  async leave(activityId: string, userId: string) {
    const participant = await ActivityParticipant.findOne({
      activityId,
      userId,
    }).exec();

    if (!participant || participant.status !== PARTICIPANT_STATUS.JOINED) {
      throw new BadRequestException("Not a participant");
    }

    participant.status = PARTICIPANT_STATUS.LEFT;
    await participant.save();

    const updatedCount = await ActivityParticipant.countDocuments({
      activityId,
      status: PARTICIPANT_STATUS.JOINED,
    });
    await Activity.findByIdAndUpdate(activityId, {
      "stats.joinedCount": updatedCount,
    }).exec();

    return participant;
  }

  async pass(activityId: string, userId: string) {
    const participant = await ActivityParticipant.findOne({
      activityId,
      userId,
      status: PARTICIPANT_STATUS.JOINED,
    }).exec();

    if (!participant) {
      throw new BadRequestException("Not a participant");
    }

    const qrToken = participant.qrTokenId
      ? await QrToken.findById(participant.qrTokenId).exec()
      : null;

    if (!qrToken) {
      throw new NotFoundException("QR token not found");
    }

    return {
      participantId: participant._id,
      activityId: participant.activityId,
      qrPayload: qrToken.payload,
    };
  }

  async cancel(activityId: string, userId: string) {
    return this.remove(activityId, userId);
  }

  private generateQrPayload(participantId: string): string {
    try {
      return jwt.sign(
        { kind: "activity", participantId },
        env.JWT_SECRET,
        { expiresIn: "30d" },
      );
    } catch (error) {
      logger.warn({ error }, "Failed to generate QR payload");
      throw error;
    }
  }
}
