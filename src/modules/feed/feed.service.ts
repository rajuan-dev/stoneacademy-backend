import { ACTIVITY_STATUS, PAGINATION } from "@/constants/app.constants";
import type { FilterQuery } from "mongoose";
import { Activity } from "@/modules/activity/activity.model";
import { Event } from "@/modules/event/event.model";
import { User } from "@/modules/user/user.model";

export class FeedService {
  async list(query: {
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const baseFilter: FilterQuery<any> = {
      status: ACTIVITY_STATUS.APPROVED,
    };

    if (query.q) {
      const pattern = new RegExp(query.q, "i");
      baseFilter.title = pattern;
    }

    const includeActivities = true;
    const includeEvents = true;
    const includeUsers = Boolean(query.q);

    const userFilter: FilterQuery<any> = {};
    if (query.q) {
      const pattern = new RegExp(query.q, "i");
      userFilter.fullName = pattern;
    }

    const [activities, events, users] = await Promise.all([
      includeActivities ? Activity.find(baseFilter).limit(limit * 2).exec() : Promise.resolve([]),
      includeEvents ? Event.find(baseFilter).limit(limit * 2).exec() : Promise.resolve([]),
      includeUsers ? User.find(userFilter).select("fullName email profileImageUrl profilePhoto createdAt").limit(limit * 2).exec() : Promise.resolve([]),
    ]);

    const merged = [
      ...activities.map((item: any) => ({
        kind: "activity",
        id: item._id.toString(),
        hostId: item.hostId?.toString?.() || item.hostId?._id?.toString?.() || null,
        name: item.title,
        type: item.type,
        createdAt: item.createdAt,
      })),
      ...events.map((item: any) => ({
        kind: "event",
        id: item._id.toString(),
        hostId: item.creatorId?.toString?.() || item.creatorId?._id?.toString?.() || null,
        creatorId: item.creatorId?.toString?.() || item.creatorId?._id?.toString?.() || null,
        name: item.title,
        type: item.type,
        createdAt: item.createdAt,
      })),
      ...users.map((user: any) => ({
        kind: "user",
        id: user._id.toString(),
        name: user.fullName,
        username: user.email ? String(user.email).split("@")[0] : null,
        imageUrl: user.profileImageUrl || null,
        createdAt: user.createdAt,
      })),
    ].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    const data = merged.slice(skip, skip + limit);
    const totalItems = merged.length;

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

  async searchFilter(query: {
    kind?: "all" | "activity" | "event";
    type?: string;
    date?: Date;
    paid?: "all" | "free" | "paid";
  }) {
    const page = PAGINATION.DEFAULT_PAGE;
    const limit = PAGINATION.DEFAULT_LIMIT;
    const skip = 0;

    const activityFilter: FilterQuery<any> = { status: ACTIVITY_STATUS.APPROVED };
    const eventFilter: FilterQuery<any> = { status: ACTIVITY_STATUS.APPROVED };

    if (query.type && query.type.toLowerCase() !== "all") {
      const pattern = new RegExp(query.type, "i");
      activityFilter.type = pattern;
      eventFilter.type = pattern;
    }

    if (query.date) {
      const dateFrom = new Date(new Date(query.date).setHours(0, 0, 0, 0));
      const dateTo = new Date(new Date(query.date).setHours(23, 59, 59, 999));
      activityFilter.startAt = {};
      eventFilter.startAt = {};
      activityFilter.startAt.$gte = dateFrom;
      activityFilter.startAt.$lte = dateTo;
      eventFilter.startAt.$gte = dateFrom;
      eventFilter.startAt.$lte = dateTo;
    }

    if (query.paid === "free") {
      eventFilter.priceType = "free";
    } else if (query.paid === "paid") {
      eventFilter.priceType = "paid";
    }

    const includeActivities = !query.kind || query.kind === "all" || query.kind === "activity";
    const includeEvents = !query.kind || query.kind === "all" || query.kind === "event";

    const [activities, events] = await Promise.all([
      includeActivities
        ? Activity.find(activityFilter)
            .populate("hostId", "fullName email")
            .populate("media", "url")
            .limit(100)
            .exec()
        : Promise.resolve([]),
      includeEvents
        ? Event.find(eventFilter)
            .populate("creatorId", "fullName email")
            .populate("media", "url")
            .limit(100)
            .exec()
        : Promise.resolve([]),
    ]);

    const merged = [
      ...activities.map((item: any) => this.mapActivityCard(item)),
      ...events.map((item: any) => this.mapEventCard(item)),
    ];

    merged.sort((a: any, b: any) => {
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });

    const data = merged.slice(skip, skip + limit);
    const totalItems = merged.length;

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

  private mapActivityCard(item: any) {
    const imageUrl = Array.isArray(item.media) && item.media.length > 0
      ? item.media[0]?.url || null
      : null;

    return {
      kind: "activity",
      id: item._id.toString(),
      hostId: item.hostId?._id?.toString?.() || item.hostId?.toString?.() || null,
      name: item.title,
      type: item.type,
      creatorName: item.hostId?.fullName || null,
      creatorUsername: item.hostId?.email ? String(item.hostId.email).split("@")[0] : null,
      startAt: item.startAt,
      createdAt: item.createdAt,
      location: item.location?.label || null,
      distanceMilesAway: null,
      participantLimit: item.participantLimit ?? null,
      joinedCount: item.stats?.joinedCount ?? 0,
      priceType: "free",
      imageUrl,
    };
  }

  private mapEventCard(item: any) {
    const imageUrl = Array.isArray(item.media) && item.media.length > 0
      ? item.media[0]?.url || null
      : null;

    return {
      kind: "event",
      id: item._id.toString(),
      hostId: item.creatorId?._id?.toString?.() || item.creatorId?.toString?.() || null,
      creatorId: item.creatorId?._id?.toString?.() || item.creatorId?.toString?.() || null,
      name: item.title,
      type: item.type,
      creatorName: item.creatorId?.fullName || null,
      creatorUsername: item.creatorId?.email ? String(item.creatorId.email).split("@")[0] : null,
      startAt: item.startAt,
      createdAt: item.createdAt,
      location: item.location?.label || null,
      distanceMilesAway: null,
      participantLimit: item.participantLimit ?? null,
      joinedCount: item.stats?.joinedCount ?? 0,
      priceType: item.priceType || (item.ticketPrice > 0 ? "paid" : "free"),
      ticketPrice: item.ticketPrice ?? 0,
      discountPercentage: item.discountPercentage ?? 0,
      imageUrl,
    };
  }
}
