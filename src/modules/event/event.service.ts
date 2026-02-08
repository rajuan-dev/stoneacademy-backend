import {
  ACTIVITY_STATUS,
  PARTICIPANT_STATUS,
  PAYMENT_STATUS,
  ROLES,
} from "@/constants/app.constants";
import { notificationService } from "@/modules/notification/notification.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type { FilterQuery } from "mongoose";
import { User } from "../user/user.model";
import { Event } from "./event.model";
import { EventParticipant } from "./event-participant.model";
import { PaymentTransaction } from "./payment-transaction.model";

type ListQuery = {
  q?: string;
  typeCategoryId?: string;
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
const PLATFORM_FEE_PERCENT = 10;

export class EventService {
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

    if (query.paid === "free") {
      filter.ticketPrice = 0;
    } else if (query.paid === "paid") {
      filter.ticketPrice = { $gt: 0 };
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

    const queryBuilder = Event.find(filter);
    if (sort) {
      queryBuilder.sort(sort);
    }

    const [data, totalItems] = await Promise.all([
      queryBuilder.skip(skip).limit(limit).exec(),
      Event.countDocuments(filter),
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
    creatorId: string;
    title: string;
    typeCategoryId: string;
    description?: string;
    startAt: Date;
    endAt?: Date;
    location?: { label: string; coordinates: [number, number] };
    participantLimit?: number;
    mediaIds?: string[];
    status?: string;
    ticketPrice: number;
    currency?: string;
  }) {
    if (payload.startAt < new Date()) {
      throw new BadRequestException("Start time must be in the future");
    }

    const creator = await User.findById(payload.creatorId).exec();
    if (!creator) {
      throw new NotFoundException("User not found");
    }

    if (!creator.creatorStatus?.subscriptionActive) {
      throw new ForbiddenException(
        "Active creator subscription is required to create events",
      );
    }

    if (creator.role !== ROLES.CREATOR) {
      throw new ForbiddenException("Only event creators can create events");
    }

    return Event.create({
      creatorId: payload.creatorId,
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
      media: payload.mediaIds || [],
      status: payload.status || ACTIVITY_STATUS.DRAFT,
      ticketPrice: payload.ticketPrice,
      currency: payload.currency || "USD",
      stats: { joinedCount: 0 },
    });
  }

  async getById(eventId: string) {
    const event = await Event.findById(eventId).exec();
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    return event;
  }

  async update(
    eventId: string,
    userId: string,
    payload: {
      title?: string;
      typeCategoryId?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
      location?: { label: string; coordinates: [number, number] };
      participantLimit?: number;
      mediaIds?: string[];
      status?: string;
      ticketPrice?: number;
      currency?: string;
    },
  ) {
    const event = await this.getById(eventId);

    if (event.creatorId.toString() !== userId) {
      throw new ForbiddenException("Only creator can edit this event");
    }

    if (payload.title !== undefined) event.title = payload.title;
    if (payload.typeCategoryId !== undefined)
      event.typeCategoryId = payload.typeCategoryId as any;
    if (payload.description !== undefined) event.description = payload.description;
    if (payload.startAt !== undefined) event.startAt = payload.startAt;
    if (payload.endAt !== undefined) event.endAt = payload.endAt;
    if (payload.location !== undefined) {
      event.location = {
        label: payload.location.label,
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
    if (payload.ticketPrice !== undefined) event.ticketPrice = payload.ticketPrice;
    if (payload.currency !== undefined) event.currency = payload.currency;

    await event.save();
    return event;
  }

  async remove(eventId: string, userId: string) {
    const event = await this.getById(eventId);
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
    if (event.ticketPrice > 0) {
      const grossAmount = this.roundMoney(event.ticketPrice);
      const platformFeeAmount = this.roundMoney((grossAmount * PLATFORM_FEE_PERCENT) / 100);
      const creatorShareAmount = this.roundMoney(grossAmount - platformFeeAmount);

      const transaction = await PaymentTransaction.create({
        payerId: userId,
        eventId: event._id,
        grossAmount,
        currency: event.currency || "USD",
        platformFeeAmount,
        creatorShareAmount,
        platformFeePercent: PLATFORM_FEE_PERCENT,
        status: PAYMENT_STATUS.SUCCEEDED,
        provider: "manual",
        providerReference: payload?.providerReference,
      });

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

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
