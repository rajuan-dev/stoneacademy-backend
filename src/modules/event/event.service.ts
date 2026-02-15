import {
  ACTIVITY_STATUS,
  PARTICIPANT_STATUS,
  PAYMENT_STATUS,
} from "@/constants/app.constants";
import { env } from "@/env";
import { Media } from "@/modules/media/media.model";
import { notificationService } from "@/modules/notification/notification.service";
import { s3Service, type StorageUploadInput } from "@/services/s3.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type { FilterQuery } from "mongoose";
import { randomBytes } from "node:crypto";
import { User } from "../user/user.model";
import { Event } from "./event.model";
import { EventParticipant } from "./event-participant.model";
import { PaymentTransaction } from "./payment-transaction.model";
import { EventQrToken } from "./event-qr-token.model";
import { ChatService } from "../chat/chat.service";

type ListQuery = {
  q?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  paid?: "free" | "paid";
  sort?: "distance" | "time" | "popular";
  page?: number;
  limit?: number;
};

const MILES_TO_METERS = 1609.34;
const EARTH_RADIUS_MILES = 3958.8;

export class EventService {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
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

    if (query.paid === "free") {
      filter.priceType = "free";
    } else if (query.paid === "paid") {
      filter.priceType = "paid";
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

    const queryBuilder = Event.find(filter)
      .populate("creatorId", "fullName email")
      .populate("media", "url");
    if (sort) {
      queryBuilder.sort(sort);
    }

    const [data, totalItems] = await Promise.all([
      queryBuilder.skip(skip).limit(limit).exec(),
      Event.countDocuments(filter),
    ]);

    const mapped = data.map((item: any) => {
      const coordinates = item.location?.coordinates?.coordinates as
        | [number, number]
        | undefined;
      const distanceMilesAway = hasGeo && coordinates
        ? this.getDistanceMiles(query.lat!, query.lng!, coordinates[1], coordinates[0])
        : null;

      const firstImageUrl = Array.isArray(item.media) && item.media.length > 0
        ? item.media[0]?.url || null
        : null;

      return {
        kind: "event",
        id: item._id.toString(),
        name: item.title,
        type: item.type,
        creatorName: item.creatorId?.fullName || null,
        creatorUsername: item.creatorId?.email
          ? String(item.creatorId.email).split("@")[0]
          : null,
        startAt: item.startAt,
        createdAt: item.createdAt,
        location: item.location?.label || null,
        distanceMilesAway,
        participantLimit: item.participantLimit ?? null,
        joinedCount: item.stats?.joinedCount ?? 0,
        imageUrl: firstImageUrl,
        priceType: item.priceType || "free",
        ticketPrice: item.ticketPrice ?? 0,
        discountPercentage: item.discountPercentage ?? 0,
        payableTicketPrice: this.calculatePayableTicketPrice(
          item.ticketPrice ?? 0,
          item.discountPercentage ?? 0,
        ),
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
    creatorId: string;
    title?: string;
    type?: string;
    description?: string;
    date?: Date;
    startAt?: Date;
    endAt?: Date;
    location?: { label?: string; coordinates: [number, number] };
    participantLimit?: number;
    mediaIds?: string[];
    mediaFiles?: Express.Multer.File[];
    status?: string;
    priceType?: "free" | "paid";
    ticketPrice?: number;
    discountPercentage?: number;
    durationMinutes?: number;
    currency?: string;
  }) {
    const startAt = payload.startAt ?? this.getDefaultFutureStartAt();
    if (startAt < new Date()) {
      throw new BadRequestException("Start time must be in the future");
    }

    const creator = await User.findById(payload.creatorId).exec();
    if (!creator) {
      throw new NotFoundException("User not found");
    }

    if (!creator.creatorStatus?.subscriptionActive) {
      throw new ForbiddenException(
        "Active subscription is required to create events",
      );
    }

    const normalizedPriceType = payload.priceType || "free";
    const normalizedTicketPrice =
      normalizedPriceType === "free"
        ? 0
        : this.roundMoney(payload.ticketPrice || 0);
    const normalizedDiscount = this.roundMoney(payload.discountPercentage || 0);
    const durationMinutes = payload.durationMinutes || 60;
    const computedEndAt =
      payload.endAt
      ?? new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    if (normalizedPriceType === "paid" && normalizedTicketPrice <= 0) {
      throw new BadRequestException("Paid event ticket price must be greater than 0");
    }

    if (normalizedDiscount < 0 || normalizedDiscount > 100) {
      throw new BadRequestException("Discount percentage must be between 0 and 100");
    }

    const uploadedMediaIds = await this.uploadMediaFiles(
      payload.creatorId,
      payload.mediaFiles,
    );

    const mediaIds = Array.from(
      new Set([...(payload.mediaIds || []), ...uploadedMediaIds]),
    );

    return Event.create({
      creatorId: payload.creatorId,
      title: payload.title || "Untitled Event",
      type: payload.type || "general",
      description: payload.description,
      startAt,
      endAt: computedEndAt,
      location: payload.location
        ? {
            label:
              payload.location.label
              || `${payload.location.coordinates[1]},${payload.location.coordinates[0]}`,
            coordinates: {
              type: "Point",
              coordinates: payload.location.coordinates,
            },
          }
        : undefined,
      participantLimit: payload.participantLimit,
      media: mediaIds,
      status: payload.status || ACTIVITY_STATUS.APPROVED,
      priceType: normalizedPriceType,
      ticketPrice: normalizedTicketPrice,
      discountPercentage: normalizedDiscount,
      durationMinutes,
      currency: payload.currency || "USD",
      stats: { joinedCount: 0 },
    });
  }

  async getById(eventId: string, options?: { allowUnapproved?: boolean }) {
    const event = await Event.findById(eventId).exec();
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    if (!options?.allowUnapproved && event.status !== ACTIVITY_STATUS.APPROVED) {
      throw new NotFoundException("Event not found");
    }
    return event;
  }

  async getByIdForUser(eventId: string, userId?: string) {
    const event = await Event.findById(eventId)
      .populate("creatorId", "fullName email profileImageUrl rating")
      .populate("media", "url type mimeType")
      .exec();
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    const isCreator = userId && (event.creatorId as any)?._id?.toString?.() === userId;
    if (!isCreator && event.status !== ACTIVITY_STATUS.APPROVED) {
      throw new NotFoundException("Event not found");
    }

    const joinedCount = await EventParticipant.countDocuments({
      eventId: event._id,
      status: PARTICIPANT_STATUS.JOINED,
    });

    let isJoined = false;
    if (userId) {
      const participant = await EventParticipant.findOne({
        eventId: event._id,
        userId,
        status: PARTICIPANT_STATUS.JOINED,
      }).select("_id").lean();
      isJoined = Boolean(participant);
    }

    const creator = event.creatorId as any;
    const mediaList = Array.isArray(event.media) ? (event.media as any[]) : [];
    const payableTicketPrice = this.calculatePayableTicketPrice(
      event.ticketPrice,
      event.discountPercentage || 0,
    );

    return {
      kind: "event",
      id: event._id.toString(),
      name: event.title,
      type: event.type,
      description: event.description || null,
      startAt: event.startAt,
      endAt: event.endAt || null,
      createdAt: event.createdAt,
      location: event.location?.label || null,
      locationCoordinates: event.location?.coordinates?.coordinates || null,
      participantLimit: event.participantLimit ?? null,
      joinedCount,
      isJoined,
      priceType: event.priceType,
      ticketPrice: event.ticketPrice,
      discountPercentage: event.discountPercentage || 0,
      payableTicketPrice,
      currency: event.currency || "USD",
      host: creator
        ? {
            id: creator._id?.toString?.() || null,
            fullName: creator.fullName || null,
            username: creator.email ? String(creator.email).split("@")[0] : null,
            profileImageUrl: creator.profileImageUrl || null,
            rating: creator.rating || { avg: 0, count: 0 },
          }
        : null,
      gallery: mediaList.map((media) => ({
        id: media._id?.toString?.() || null,
        url: media.url || null,
        type: media.type || null,
        mimeType: media.mimeType || null,
      })),
      status: event.status,
    };
  }

  async update(
    eventId: string,
    userId: string,
    payload: {
      title?: string;
      type?: string;
      description?: string;
      date?: Date;
      startAt?: Date;
      endAt?: Date;
      location?: { label?: string; coordinates: [number, number] };
      participantLimit?: number;
      mediaIds?: string[];
      status?: string;
      priceType?: "free" | "paid";
      ticketPrice?: number;
      discountPercentage?: number;
      durationMinutes?: number;
      currency?: string;
    },
  ) {
    const event = await this.getById(eventId, { allowUnapproved: true });

    if (event.creatorId.toString() !== userId) {
      throw new ForbiddenException("Only creator can edit this event");
    }

    if (payload.title !== undefined) event.title = payload.title;
    if (payload.type !== undefined) event.type = payload.type;
    if (payload.description !== undefined) event.description = payload.description;
    if (payload.startAt !== undefined) {
      event.startAt = payload.startAt;
      if (payload.endAt === undefined && payload.durationMinutes === undefined && event.durationMinutes) {
        event.endAt = new Date(
          event.startAt.getTime() + event.durationMinutes * 60 * 1000,
        );
      }
    }
    if (payload.endAt !== undefined) event.endAt = payload.endAt;
    if (payload.location !== undefined) {
      event.location = {
        label:
          payload.location.label
          || `${payload.location.coordinates[1]},${payload.location.coordinates[0]}`,
        coordinates: {
          type: "Point",
          coordinates: payload.location.coordinates,
        },
      };
    }
    if (payload.participantLimit !== undefined) {
      event.participantLimit = payload.participantLimit;
    }
    if (payload.mediaIds !== undefined) event.media = payload.mediaIds as any;
    if (payload.status !== undefined) event.status = payload.status as any;

    const nextPriceType = payload.priceType ?? event.priceType ?? "free";
    const nextTicketPrice =
      payload.ticketPrice !== undefined
        ? this.roundMoney(payload.ticketPrice)
        : event.ticketPrice;
    const nextDiscount =
      payload.discountPercentage !== undefined
        ? this.roundMoney(payload.discountPercentage)
        : event.discountPercentage || 0;

    if (nextPriceType === "paid" && nextTicketPrice <= 0) {
      throw new BadRequestException("Paid event ticket price must be greater than 0");
    }

    if (nextDiscount < 0 || nextDiscount > 100) {
      throw new BadRequestException("Discount percentage must be between 0 and 100");
    }

    event.priceType = nextPriceType;
    event.ticketPrice = nextPriceType === "free" ? 0 : nextTicketPrice;
    event.discountPercentage = nextPriceType === "free" ? 0 : nextDiscount;

    if (payload.durationMinutes !== undefined) {
      event.durationMinutes = payload.durationMinutes;
      if (payload.endAt === undefined) {
        event.endAt = new Date(
          event.startAt.getTime() + payload.durationMinutes * 60 * 1000,
        );
      }
    }
    if (payload.currency !== undefined) event.currency = payload.currency;

    await event.save();
    return event;
  }

  async remove(eventId: string, userId: string) {
    const event = await this.getById(eventId, { allowUnapproved: true });
    if (event.creatorId.toString() !== userId) {
      throw new ForbiddenException("Only creator can cancel this event");
    }

    event.status = ACTIVITY_STATUS.CANCELLED;
    await event.save();

    await EventParticipant.updateMany(
      { eventId: event._id, status: PARTICIPANT_STATUS.JOINED },
      { status: PARTICIPANT_STATUS.CANCELLED },
    ).exec();

    return event;
  }

  async join(
    eventId: string,
    userId: string,
    payload?: {
      providerReference?: string;
    },
  ) {
    const event = await this.getById(eventId);

    if (event.status === ACTIVITY_STATUS.CANCELLED) {
      throw new BadRequestException("Event is cancelled");
    }

    if (event.startAt < new Date()) {
      throw new BadRequestException("Event already started");
    }

    if (event.creatorId.toString() === userId) {
      throw new BadRequestException("Creator cannot join own event");
    }

    const blocked = await this.isBlocked(userId, event.creatorId.toString());
    if (blocked) {
      throw new ForbiddenException("You cannot join this event");
    }

    const existing = await EventParticipant.findOne({
      eventId: event._id,
      userId,
    }).exec();

    if (existing && existing.status === PARTICIPANT_STATUS.JOINED) {
      throw new BadRequestException("Already joined");
    }

    const joinedCount = await EventParticipant.countDocuments({
      eventId: event._id,
      status: PARTICIPANT_STATUS.JOINED,
    });

    if (event.participantLimit && joinedCount >= event.participantLimit) {
      throw new BadRequestException("Event is full");
    }

    let paymentTransactionId: string | undefined;
    const payableTicketPrice = this.calculatePayableTicketPrice(
      event.ticketPrice,
      event.discountPercentage || 0,
    );

    if (payableTicketPrice > 0) {
      if (!payload?.providerReference) {
        throw new BadRequestException("Payment is required to join this event");
      }

      const transaction = await PaymentTransaction.findOne({
        eventId: event._id,
        payerId: userId,
        providerReference: payload.providerReference,
        status: PAYMENT_STATUS.SUCCEEDED,
      })
        .sort({ createdAt: -1 })
        .exec();

      if (!transaction) {
        throw new BadRequestException(
          "Payment not verified. Complete Stripe payment first.",
        );
      }

      paymentTransactionId = transaction._id.toString();
    }

    const participant =
      existing ||
      new EventParticipant({
        eventId: event._id,
        userId,
      });

    participant.status = PARTICIPANT_STATUS.JOINED;
    participant.joinedAt = new Date();
    if (paymentTransactionId) {
      participant.paymentTransactionId = paymentTransactionId as any;
    }

    await participant.save();

    const updatedCount = await EventParticipant.countDocuments({
      eventId: event._id,
      status: PARTICIPANT_STATUS.JOINED,
    });

    event.stats = { joinedCount: updatedCount };
    await event.save();

    await notificationService.create({
      userId: event.creatorId.toString(),
      type: "event_joined",
      title: "New event ticket",
      body: "A user joined your event.",
      payload: {
        eventId: event._id.toString(),
        participantId: participant._id.toString(),
      },
    });

    return participant;
  }

  async leave(eventId: string, userId: string) {
    const participant = await EventParticipant.findOne({
      eventId,
      userId,
    }).exec();

    if (!participant || participant.status !== PARTICIPANT_STATUS.JOINED) {
      throw new BadRequestException("Not a participant");
    }

    participant.status = PARTICIPANT_STATUS.LEFT;
    await participant.save();

    const updatedCount = await EventParticipant.countDocuments({
      eventId,
      status: PARTICIPANT_STATUS.JOINED,
    });
    await Event.findByIdAndUpdate(eventId, {
      "stats.joinedCount": updatedCount,
    }).exec();

    return participant;
  }

  async pass(eventId: string, userId: string) {
    const participant = await EventParticipant.findOne({
      eventId,
      userId,
      status: PARTICIPANT_STATUS.JOINED,
    }).exec();

    if (!participant) {
      throw new BadRequestException("You are not a participant of this event");
    }

    let token = await EventQrToken.findOne({
      participantId: participant._id,
      revokedAt: { $exists: false },
    }).exec();

    if (!token) {
      const payload = randomBytes(24).toString("hex");
      token = await EventQrToken.create({
        kind: "event",
        participantId: participant._id,
        payload,
      });
    }

    return {
      participantId: participant._id.toString(),
      eventId,
      qrPayload: token.payload,
    };
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private calculatePayableTicketPrice(
    ticketPrice: number,
    discountPercentage: number,
  ): number {
    if (ticketPrice <= 0) return 0;
    if (discountPercentage <= 0) return this.roundMoney(ticketPrice);

    const discounted = ticketPrice - (ticketPrice * discountPercentage) / 100;
    return this.roundMoney(Math.max(0, discounted));
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
      prefix: `events/${ownerId}`,
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

  async messageHost(
    eventId: string,
    userId: string,
    payload?: { text?: string },
  ) {
    const event = await this.getById(eventId, { allowUnapproved: true });
    const hostId = event.creatorId.toString();
    if (hostId === userId) {
      throw new BadRequestException("Creator cannot message self");
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
}
