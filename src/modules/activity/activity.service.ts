// file: src/modules/activity/activity.service.ts

import { ACTIVITY_STATUS, PARTICIPANT_STATUS } from "@/constants/app.constants";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { Media } from "@/modules/media/media.model";
import { notificationService } from "@/modules/notification/notification.service";
import { s3Service, type StorageUploadInput } from "@/services/s3.service";
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
import { User } from "../user/user.model";
import { ChatService } from "../chat/chat.service";
import { SubscriptionService } from "../subscription/subscription.service";

type ListQuery = {
  q?: string;
  type?: string;
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
const EARTH_RADIUS_MILES = 3958.8;
const FREE_ACTIVITY_POST_LIMIT = 100;

export class ActivityService {
  private chatService: ChatService;
  private subscriptionService: SubscriptionService;

  constructor() {
    this.chatService = new ChatService();
    this.subscriptionService = new SubscriptionService();
  }

  async list(query: ListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<any> = {
      status: ACTIVITY_STATUS.APPROVED,
    };

    if (query.q) {
      const pattern = new RegExp(query.q, "i");
      filter.$or = [{ title: pattern }, { description: pattern }];
    }

    if (query.type && query.type.toLowerCase() !== "all") {
      filter.type = new RegExp(query.type, "i");
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

    const queryBuilder = Activity.find(filter)
      .populate("hostId", "fullName email profileImageUrl rating")
      .populate("media", "url");
    if (sort) {
      queryBuilder.sort(sort);
    }

    const [data, totalItems] = await Promise.all([
      queryBuilder.skip(skip).limit(limit).exec(),
      Activity.countDocuments(filter),
    ]);

    const mapped = data.map((item: any) => {
      const coordinates = item.location?.coordinates?.coordinates as
        | [number, number]
        | undefined;
      const host = item.hostId as any;
      const distanceMilesAway = hasGeo && coordinates
        ? this.getDistanceMiles(query.lat!, query.lng!, coordinates[1], coordinates[0])
        : null;

      const firstImageUrl = Array.isArray(item.media) && item.media.length > 0
        ? item.media[0]?.url || null
        : null;

      return {
        kind: "activity",
        id: item._id.toString(),
        hostId: host?._id?.toString?.() || host?.toString?.() || null,
        name: item.title,
        title: item.title,
        type: item.type,
        description: item.description || null,
        creatorName: host?.fullName || null,
        creatorUsername: host?.email
          ? String(host.email).split("@")[0]
          : null,
        creatorProfileImageUrl: host?.profileImageUrl || null,
        creatorRating: host?.rating || { avg: 0, count: 0 },
        rating: host?.rating || { avg: 0, count: 0 },
        ratingAvg: host?.rating?.avg ?? 0,
        ratingCount: host?.rating?.count ?? 0,
        startAt: item.startAt,
        createdAt: item.createdAt,
        location: item.location?.label || null,
        distanceMilesAway,
        participantLimit: item.participantLimit ?? null,
        joinedCount: item.stats?.joinedCount ?? 0,
        imageUrl: firstImageUrl,
        status: item.status,
      };
    });

    return {
      data: mapped,
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
    title?: string;
    type?: string;
    description?: string;
    startAt?: Date;
    endAt?: Date;
    location?: { label: string; coordinates: [number, number] };
    participantLimit?: number;
    distanceMiles?: number;
    mediaIds?: string[];
    mediaFiles?: Express.Multer.File[];
    status?: string;
  }) {
    const startAt = payload.startAt ?? this.getDefaultFutureStartAt();
    if (startAt < new Date()) {
      throw new BadRequestException("Start time must be in the future");
    }

    const hasSubscription = await this.subscriptionService.hasActiveSubscription(
      payload.hostId,
    );

    if (!hasSubscription) {
      const totalCreatedActivities = await Activity.countDocuments({
        hostId: payload.hostId,
      }).exec();

      if (totalCreatedActivities >= FREE_ACTIVITY_POST_LIMIT) {
        throw new ForbiddenException(
          `Without subscription you can create up to ${FREE_ACTIVITY_POST_LIMIT} activity posts. Subscribe to unlock unlimited posts.`,
        );
      }
    }

    const uploadedMediaIds = await this.uploadMediaFiles(
      payload.hostId,
      payload.mediaFiles,
    );

    const mediaIds = Array.from(
      new Set([...(payload.mediaIds || []), ...uploadedMediaIds]),
    );

    return Activity.create({
      hostId: payload.hostId,
      title: payload.title || "Untitled Activity",
      type: payload.type || "general",
      description: payload.description,
      startAt,
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
      media: mediaIds,
      status: payload.status || ACTIVITY_STATUS.APPROVED,
      stats: { joinedCount: 0 },
    });
  }

  async getById(activityId: string, options?: { allowUnapproved?: boolean }) {
    const activity = await Activity.findById(activityId).exec();
    if (!activity) {
      throw new NotFoundException("Activity not found");
    }
    if (!options?.allowUnapproved && activity.status !== ACTIVITY_STATUS.APPROVED) {
      throw new NotFoundException("Activity not found");
    }
    return activity;
  }

  async getByIdForUser(activityId: string, userId?: string) {
    const activity = await Activity.findById(activityId)
      .populate("hostId", "fullName email profileImageUrl rating")
      .populate("media", "url type mimeType")
      .exec();
    if (!activity) {
      throw new NotFoundException("Activity not found");
    }
    const isHost = userId && activity.hostId?._id?.toString?.() === userId;
    if (!isHost && activity.status !== ACTIVITY_STATUS.APPROVED) {
      throw new NotFoundException("Activity not found");
    }

    const joinedCount = await ActivityParticipant.countDocuments({
      activityId: activity._id,
      status: PARTICIPANT_STATUS.JOINED,
    });

    let isJoined = false;
    if (userId) {
      const participant = await ActivityParticipant.findOne({
        activityId: activity._id,
        userId,
        status: PARTICIPANT_STATUS.JOINED,
      }).select("_id").lean();
      isJoined = Boolean(participant);
    }

    const host = activity.hostId as any;
    const mediaList = Array.isArray(activity.media) ? (activity.media as any[]) : [];

    return {
      kind: "activity",
      id: activity._id.toString(),
      hostId: host?._id?.toString?.() || null,
      name: activity.title,
      title: activity.title,
      type: activity.type,
      description: activity.description || null,
      startAt: activity.startAt,
      endAt: activity.endAt || null,
      createdAt: activity.createdAt,
      location: activity.location?.label || null,
      locationCoordinates: activity.location?.coordinates?.coordinates || null,
      participantLimit: activity.participantLimit ?? null,
      joinedCount,
      isJoined,
      distanceMiles: activity.distanceMiles ?? null,
      creatorName: host?.fullName || null,
      creatorUsername: host?.email ? String(host.email).split("@")[0] : null,
      creatorProfileImageUrl: host?.profileImageUrl || null,
      creatorRating: host?.rating || { avg: 0, count: 0 },
      rating: host?.rating || { avg: 0, count: 0 },
      ratingAvg: host?.rating?.avg ?? 0,
      ratingCount: host?.rating?.count ?? 0,
      host: host
        ? {
            id: host._id?.toString?.() || null,
            fullName: host.fullName || null,
            username: host.email ? String(host.email).split("@")[0] : null,
            profileImageUrl: host.profileImageUrl || null,
            rating: host.rating || { avg: 0, count: 0 },
          }
        : null,
      gallery: mediaList.map((media) => ({
        id: media._id?.toString?.() || null,
        url: media.url || null,
        type: media.type || null,
        mimeType: media.mimeType || null,
      })),
      status: activity.status,
      isFree: true,
    };
  }

  async getJoinStatus(activityId: string, userId: string) {
    const activity = await this.getById(activityId, { allowUnapproved: true });
    const participant = await ActivityParticipant.findOne({
      activityId: activity._id,
      userId,
      status: PARTICIPANT_STATUS.JOINED,
    })
      .select("_id joinedAt")
      .lean();

    return {
      activityId: activity._id.toString(),
      isJoined: Boolean(participant),
      joinedAt: participant?.joinedAt || null,
      paymentRequired: false,
      paymentVerified: true,
      paymentStatus: null,
      providerReference: null,
    };
  }

  async getJoinedUsers(activityId: string) {
    const activity = await this.getById(activityId, { allowUnapproved: true });
    const participants = await ActivityParticipant.find({
      activityId: activity._id,
      status: PARTICIPANT_STATUS.JOINED,
    })
      .select("userId joinedAt")
      .populate("userId", "profileImageUrl")
      .sort({ joinedAt: -1, createdAt: -1 })
      .lean();

    const users = participants.map((item: any) => ({
      userId: item.userId?._id?.toString?.() || item.userId?.toString?.() || null,
      profileAvatar: item.userId?.profileImageUrl || null,
      joinedAt: item.joinedAt || null,
    }));

    return {
      activityId: activity._id.toString(),
      joinedCount: users.length,
      users,
    };
  }

  async update(
    activityId: string,
    userId: string,
    payload: {
      title?: string;
      type?: string;
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
    const activity = await this.getById(activityId, { allowUnapproved: true });

    if (activity.hostId.toString() !== userId) {
      throw new ForbiddenException("Only host can edit this activity");
    }

    const changedFields: string[] = [];

    if (payload.title !== undefined) {
      activity.title = payload.title;
      changedFields.push("title");
    }
    if (payload.type !== undefined) {
      activity.type = payload.type;
      changedFields.push("type");
    }
    if (payload.description !== undefined) {
      changedFields.push("description");
      activity.description = payload.description;
    }
    if (payload.startAt !== undefined) {
      activity.startAt = payload.startAt;
      changedFields.push("startAt");
    }
    if (payload.endAt !== undefined) {
      activity.endAt = payload.endAt;
      changedFields.push("endAt");
    }
    if (payload.location !== undefined) {
      activity.location = {
        label: payload.location.label,
        coordinates: {
          type: "Point",
          coordinates: payload.location.coordinates,
        },
      };
      changedFields.push("location");
    }
    if (payload.participantLimit !== undefined) {
      activity.participantLimit = payload.participantLimit;
      changedFields.push("participantLimit");
    }
    if (payload.distanceMiles !== undefined) {
      activity.distanceMiles = payload.distanceMiles;
      changedFields.push("distanceMiles");
    }
    if (payload.mediaIds !== undefined) {
      activity.media = payload.mediaIds as any;
      changedFields.push("media");
    }
    if (payload.status !== undefined) {
      activity.status = payload.status as any;
      changedFields.push("status");
    }

    await activity.save();

    if (changedFields.length > 0) {
      await this.notifyParticipants(
        activity._id.toString(),
        userId,
        "activity_updated",
        "Activity updated",
        `The activity "${activity.title}" was updated.`,
        {
          activityId: activity._id.toString(),
          entityType: "activity",
          entityId: activity._id.toString(),
          changedFields,
        },
      );
    }

    return activity;
  }

  async remove(activityId: string, userId: string) {
    const activity = await this.getById(activityId, { allowUnapproved: true });
    if (activity.hostId.toString() !== userId) {
      throw new ForbiddenException("Only host can delete this activity");
    }

    activity.status = ACTIVITY_STATUS.CANCELLED;
    await activity.save();

    await ActivityParticipant.updateMany(
      { activityId: activity._id, status: PARTICIPANT_STATUS.JOINED },
      { status: PARTICIPANT_STATUS.CANCELLED },
    ).exec();

    await this.notifyParticipants(
      activity._id.toString(),
      userId,
      "activity_cancelled",
      "Activity cancelled",
      `The activity "${activity.title}" has been cancelled.`,
      {
        activityId: activity._id.toString(),
        entityType: "activity",
        entityId: activity._id.toString(),
      },
    );

    return activity;
  }

  async join(activityId: string, userId: string) {
    const activity = await this.getById(activityId, { allowUnapproved: true });

    if (activity.status !== ACTIVITY_STATUS.APPROVED) {
      throw new BadRequestException("Activity is not approved");
    }

    const blocked = await this.isBlocked(userId, activity.hostId.toString());
    if (blocked) {
      throw new ForbiddenException("You cannot join this activity");
    }

    if (activity.hostId.toString() === userId) {
      throw new BadRequestException("Host cannot join own activity");
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

    if (activity.hostId.toString() !== userId) {
      const actor = await this.getActorSummary(userId);
      await notificationService.create({
        userId: activity.hostId.toString(),
        type: "activity_joined",
        title: "New activity join",
        body: `${actor.fullName || "A user"} joined your activity.`,
        payload: {
          activityId: activity._id.toString(),
          participantId: participant._id.toString(),
          entityType: "activity",
          entityId: activity._id.toString(),
          joinedUserId: actor.id,
          joinedUserName: actor.fullName,
          joinedUserAvatar: actor.profileImageUrl,
        },
      });
    }

    await notificationService.create({
      userId,
      type: "activity_join_success",
      title: "Joined activity successfully",
      body: `You joined "${activity.title}".`,
      payload: {
        activityId: activity._id.toString(),
        participantId: participant._id.toString(),
        entityType: "activity",
        entityId: activity._id.toString(),
        hostId: activity.hostId.toString(),
        joinedAt: participant.joinedAt,
      },
    });

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

    const activity = await Activity.findById(activityId).select("hostId title").lean();
    const hostId = activity?.hostId?.toString() || null;
    if (hostId && hostId !== userId) {
      const actor = await this.getActorSummary(userId);
      await notificationService.create({
        userId: hostId,
        type: "activity_left",
        title: "Participant left activity",
        body: `${actor.fullName || "A participant"} left your activity.`,
        payload: {
          activityId,
          entityType: "activity",
          entityId: activityId,
          participantId: participant._id.toString(),
          leftUserId: actor.id,
          leftUserName: actor.fullName,
          leftUserAvatar: actor.profileImageUrl,
        },
      });
    }

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

  async messageHost(
    activityId: string,
    userId: string,
    payload?: { text?: string },
  ) {
    const activity = await this.getById(activityId, { allowUnapproved: true });
    const hostId = activity.hostId.toString();
    if (hostId === userId) {
      throw new BadRequestException("Host cannot message self");
    }

    const thread = await this.chatService.ensureDirectThread(userId, hostId);

    let message: any = null;
    if (payload?.text && payload.text.trim()) {
      const sent = await this.chatService.sendMessageToThread(userId, {
        threadId: thread._id,
        type: "text",
        text: payload.text.trim(),
      });
      message = sent.message || null;
    }

    return {
      threadId: thread._id,
      hostId,
      message,
    };
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

  private async isBlocked(userId: string, otherUserId: string) {
    if (userId === otherUserId) return false;
    const [user, other] = await Promise.all([
      User.findById(userId).select("blockedUsers").exec(),
      User.findById(otherUserId).select("blockedUsers").exec(),
    ]);
    const userBlocksOther = user?.blockedUsers?.some(
      (id) => id.toString() === otherUserId,
    );
    const otherBlocksUser = other?.blockedUsers?.some(
      (id) => id.toString() === userId,
    );
    return Boolean(userBlocksOther || otherBlocksUser);
  }

  private async uploadMediaFiles(
    ownerId: string,
    mediaFiles?: Express.Multer.File[],
  ): Promise<string[]> {
    if (!mediaFiles?.length) return [];

    const uploadsInput: StorageUploadInput[] = mediaFiles.map((file) => ({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    }));

    const uploads = await s3Service.uploadFiles(uploadsInput, {
      prefix: `activities/${ownerId}`,
    });

    const mediaDocs = await Media.insertMany(
      uploads.map((upload, index) => ({
        ownerId,
        type: uploadsInput[index].mimeType.startsWith("video/")
          ? "video"
          : "image",
        s3Bucket: env.AWS_S3_BUCKET,
        s3Key: upload.key,
        url: upload.url,
        mimeType: uploadsInput[index].mimeType,
        sizeBytes: uploadsInput[index].buffer.length,
      })),
    );

    return mediaDocs.map((doc) => doc._id.toString());
  }

  private async notifyParticipants(
    activityId: string,
    actorUserId: string,
    type: string,
    title: string,
    body: string,
    payload?: Record<string, unknown>,
  ) {
    const participants = await ActivityParticipant.find({
      activityId,
      status: PARTICIPANT_STATUS.JOINED,
      userId: { $ne: actorUserId as any },
    })
      .select("userId")
      .lean();

    const userIds = participants
      .map((participant: any) => participant.userId?.toString?.() || null)
      .filter(Boolean) as string[];

    if (userIds.length === 0) return;

    await notificationService.createMany(
      userIds.map((participantUserId) => ({
        userId: participantUserId,
        type,
        title,
        body,
        payload,
      })),
    );
  }

  private async getActorSummary(userId: string) {
    const user = await User.findById(userId)
      .select("fullName profileImageUrl")
      .lean();

    return {
      id: userId,
      fullName: user?.fullName || null,
      profileImageUrl: user?.profileImageUrl || null,
    };
  }

  private getDefaultFutureStartAt(): Date {
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  private getDistanceMiles(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(toLat - fromLat);
    const dLng = toRad(toLng - fromLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRad(fromLat))
      * Math.cos(toRad(toLat))
      * Math.sin(dLng / 2)
      * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((EARTH_RADIUS_MILES * c).toFixed(2));
  }
}

