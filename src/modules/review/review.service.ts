import { PAGINATION, PARTICIPANT_STATUS } from "@/constants/app.constants";
import { notificationService } from "@/modules/notification/notification.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { Activity } from "../activity/activity.model";
import { ActivityParticipant } from "../activity/activity-participant.model";
import { Event } from "../event/event.model";
import { EventParticipant } from "../event/event-participant.model";
import { User } from "../user/user.model";
import { Review } from "./review.model";
import { Types } from "mongoose";

export class ReviewService {
  async create(
    reviewerId: string,
    payload: {
      targetType: "activity" | "event";
      targetId: string;
      rating: number;
      tags?: string[];
      comment?: string;
    },
  ) {
    const targetUserId = await this.resolveTargetUserIdAndValidateEligibility(
      reviewerId,
      payload.targetType,
      payload.targetId,
    );

    const review = await Review.create({
      reviewerId,
      targetUserId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      rating: payload.rating,
      tags: payload.tags || [],
      comment: payload.comment,
    });

    await this.recalculateUserRating(targetUserId);

    if (targetUserId !== reviewerId) {
      await notificationService.create({
        userId: targetUserId,
        type: "rating_received",
        title: "New rating received",
        body: `You received a ${payload.rating}-star rating.`,
        payload: {
          reviewId: review._id.toString(),
          targetType: payload.targetType,
          targetId: payload.targetId,
        },
      });
    }

    return review;
  }

  async list(query: {
    targetUserId?: string;
    targetType?: "activity" | "event";
    targetId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.targetUserId) filter.targetUserId = query.targetUserId;
    if (query.targetType) filter.targetType = query.targetType;
    if (query.targetId) filter.targetId = query.targetId;

    const [data, totalItems] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Review.countDocuments(filter),
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

  private async resolveTargetUserIdAndValidateEligibility(
    reviewerId: string,
    targetType: "activity" | "event",
    targetId: string,
  ) {
    if (targetType === "activity") {
      const activity = await Activity.findById(targetId).exec();
      if (!activity) throw new NotFoundException("Activity not found");

      const participant = await ActivityParticipant.findOne({
        activityId: targetId,
        userId: reviewerId,
        status: PARTICIPANT_STATUS.JOINED,
      }).exec();
      if (!participant) {
        throw new BadRequestException("Only participants can review this activity");
      }

      return activity.hostId.toString();
    }

    const event = await Event.findById(targetId).exec();
    if (!event) throw new NotFoundException("Event not found");

    const participant = await EventParticipant.findOne({
      eventId: targetId,
      userId: reviewerId,
      status: PARTICIPANT_STATUS.JOINED,
    }).exec();
    if (!participant) {
      throw new BadRequestException("Only participants can review this event");
    }

    return event.creatorId.toString();
  }

  private async recalculateUserRating(userId: string) {
    const [summary] = await Review.aggregate([
      { $match: { targetUserId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$targetUserId",
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    await User.findByIdAndUpdate(userId, {
      rating: {
        avg: summary ? Number(summary.avg.toFixed(2)) : 0,
        count: summary ? summary.count : 0,
      },
    }).exec();
  }
}
