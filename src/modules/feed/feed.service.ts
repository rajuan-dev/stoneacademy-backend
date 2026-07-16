import { ACTIVITY_STATUS, PAGINATION } from "@/constants/app.constants";
import type { FilterQuery } from "mongoose";
import { Activity } from "@/modules/activity/activity.model";
import { ActivityParticipant } from "@/modules/activity/activity-participant.model";
import { Ad } from "@/modules/ads/ads.model";
import { Event } from "@/modules/event/event.model";
import { EventParticipant } from "@/modules/event/event-participant.model";
import {
  buildGeographyFilter,
  getUserGeography,
} from "@/utils/geography.utils";

export class FeedService {
  async list(query: {
    q?: string;
    state?: string;
    city?: string;
    page?: number;
    limit?: number;
    userId: string;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const viewerGeography = await getUserGeography(query.userId);
    const geographyFilter = buildGeographyFilter({
      country: viewerGeography.country,
      state: query.state,
      city: query.city,
    });

    const baseFilter: FilterQuery<any> = {
      status: ACTIVITY_STATUS.APPROVED,
      ...geographyFilter,
    };

    if (query.q) {
      const pattern = new RegExp(query.q, "i");
      baseFilter.$or = [{ title: pattern }, { description: pattern }];
    }

    const includeActivities = true;
    const includeEvents = true;

    const adFilter: FilterQuery<any> = {
      status: "active",
      ...geographyFilter,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: new Date() } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: new Date() } }] },
      ],
    };

    if (query.q) {
      const pattern = new RegExp(query.q, "i");
      adFilter.name = pattern;
    }

    const [activities, events, ads] = await Promise.all([
      includeActivities
        ? Activity.find(baseFilter)
            .populate("hostId", "fullName email profileImageUrl rating")
            .populate("media", "url")
            .limit(limit * 2)
            .exec()
        : Promise.resolve([]),
      includeEvents
        ? Event.find(baseFilter)
            .populate("creatorId", "fullName email profileImageUrl rating")
            .populate("media", "url")
            .limit(limit * 2)
            .exec()
        : Promise.resolve([]),
      Ad.find(adFilter).limit(limit * 2).exec(),
    ]);

    const [activityParticipants, eventParticipants] = await Promise.all([
      activities.length
        ? ActivityParticipant.find({
            activityId: { $in: activities.map((item: any) => item._id) },
            status: "joined",
          })
            .select("activityId userId")
            .lean()
        : Promise.resolve([]),
      events.length
        ? EventParticipant.find({
            eventId: { $in: events.map((item: any) => item._id) },
            status: "joined",
          })
            .select("eventId userId")
            .lean()
        : Promise.resolve([]),
    ]);

    const joinedUserIdsByActivity = new Map<string, string[]>();
    for (const participant of activityParticipants as Array<any>) {
      const activityId = participant.activityId.toString();
      const existing = joinedUserIdsByActivity.get(activityId) || [];
      existing.push(participant.userId.toString());
      joinedUserIdsByActivity.set(activityId, existing);
    }

    const joinedUserIdsByEvent = new Map<string, string[]>();
    for (const participant of eventParticipants as Array<any>) {
      const eventId = participant.eventId.toString();
      const existing = joinedUserIdsByEvent.get(eventId) || [];
      existing.push(participant.userId.toString());
      joinedUserIdsByEvent.set(eventId, existing);
    }

    const adItems = ads.map((item: any) => ({
        kind: "ad",
        id: item._id.toString(),
        name: item.name,
        imageUrl: item.imageUrl,
        linkUrl: item.linkUrl,
        country: item.country || null,
        state: item.state || null,
        city: item.city || null,
        createdAt: item.createdAt,
      }));
    const contentItems = [
      ...activities.map((item: any) =>
        this.mapFeedActivityCard(
          item,
          joinedUserIdsByActivity.get(item._id.toString()) || [],
        )),
      ...events.map((item: any) =>
        this.mapFeedEventCard(
          item,
          joinedUserIdsByEvent.get(item._id.toString()) || [],
        )),
    ].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    const merged = this.injectAdsIntoFeed(contentItems, adItems);

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

  private mapFeedActivityCard(item: any, joinedUserIds: string[]) {
    const host = item.hostId as any;
    const imageUrl = Array.isArray(item.media) && item.media.length > 0
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
      creatorUsername: host?.email ? String(host.email).split("@")[0] : null,
      creatorProfileImageUrl: host?.profileImageUrl || null,
      creatorRating: host?.rating || { avg: 0, count: 0 },
      rating: host?.rating || { avg: 0, count: 0 },
      ratingAvg: host?.rating?.avg ?? 0,
      ratingCount: host?.rating?.count ?? 0,
      startAt: item.startAt,
      createdAt: item.createdAt,
      location: item.location?.label || null,
      country: item.country || null,
      state: item.state || null,
      city: item.city || null,
      distanceMilesAway: null,
      distanceMiles: item.distanceMiles != null ? String(item.distanceMiles) : null,
      participantLimit: item.participantLimit ?? null,
      joinedCount: item.stats?.joinedCount ?? joinedUserIds.length,
      joinedUserIds,
      imageUrl,
      status: item.status,
    };
  }

  private mapFeedEventCard(item: any, joinedUserIds: string[]) {
    const creator = item.creatorId as any;
    const imageUrl = Array.isArray(item.media) && item.media.length > 0
      ? item.media[0]?.url || null
      : null;

    return {
      kind: "event",
      id: item._id.toString(),
      hostId: creator?._id?.toString?.() || creator?.toString?.() || null,
      creatorId: creator?._id?.toString?.() || creator?.toString?.() || null,
      name: item.title,
      title: item.title,
      type: item.type,
      description: item.description || null,
      creatorName: creator?.fullName || null,
      creatorUsername: creator?.email ? String(creator.email).split("@")[0] : null,
      creatorProfileImageUrl: creator?.profileImageUrl || null,
      creatorRating: creator?.rating || { avg: 0, count: 0 },
      rating: creator?.rating || { avg: 0, count: 0 },
      ratingAvg: creator?.rating?.avg ?? 0,
      ratingCount: creator?.rating?.count ?? 0,
      startAt: item.startAt,
      createdAt: item.createdAt,
      location: item.location?.label || null,
      country: item.country || null,
      state: item.state || null,
      city: item.city || null,
      distanceMilesAway: null,
      participantLimit: item.participantLimit ?? null,
      joinedCount: item.stats?.joinedCount ?? joinedUserIds.length,
      joinedUserIds,
      imageUrl,
      durationMinutes: item.durationMinutes != null ? String(item.durationMinutes) : null,
      priceType: item.priceType || (item.ticketPrice > 0 ? "paid" : "free"),
      ticketPrice: item.ticketPrice ?? 0,
      discountPercentage: item.discountPercentage ?? 0,
      payableTicketPrice: item.ticketPrice > 0
        ? Number(
            Math.max(
              0,
              (item.ticketPrice ?? 0) - ((item.ticketPrice ?? 0) * (item.discountPercentage ?? 0)) / 100,
            ).toFixed(2),
          )
        : 0,
      status: item.status,
    };
  }

  async searchFilter(query: {
    kind?: "all" | "activity" | "event" | "ad";
    type?: string;
    date?: Date;
    paid?: "all" | "free" | "paid";
    state?: string;
    city?: string;
    userId: string;
  }) {
    const page = PAGINATION.DEFAULT_PAGE;
    const limit = PAGINATION.DEFAULT_LIMIT;
    const skip = 0;
    const viewerGeography = await getUserGeography(query.userId);
    const geographyFilter = buildGeographyFilter({
      country: viewerGeography.country,
      state: query.state,
      city: query.city,
    });

    const activityFilter: FilterQuery<any> = {
      status: ACTIVITY_STATUS.APPROVED,
      ...geographyFilter,
    };
    const eventFilter: FilterQuery<any> = {
      status: ACTIVITY_STATUS.APPROVED,
      ...geographyFilter,
    };
    const adFilter: FilterQuery<any> = {
      status: "active",
      ...geographyFilter,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: new Date() } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: new Date() } }] },
      ],
    };

    if (query.type && query.type.toLowerCase() !== "all") {
      const pattern = new RegExp(query.type, "i");
      activityFilter.type = pattern;
      eventFilter.type = pattern;
      adFilter.name = pattern;
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
    const includeAds = !query.kind || query.kind === "all" || query.kind === "ad";

    const [activities, events, ads] = await Promise.all([
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
      includeAds
        ? Ad.find(adFilter).limit(100).exec()
        : Promise.resolve([]),
    ]);

    const merged = [
      ...ads.map((item: any) => ({
        kind: "ad",
        id: item._id.toString(),
        name: item.name,
        imageUrl: item.imageUrl,
        linkUrl: item.linkUrl,
        country: item.country || null,
        state: item.state || null,
        city: item.city || null,
        startAt: item.startsAt || item.createdAt,
        createdAt: item.createdAt,
      })),
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
      country: item.country || null,
      state: item.state || null,
      city: item.city || null,
      distanceMilesAway: null,
      distanceMiles: item.distanceMiles != null ? String(item.distanceMiles) : null,
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
      country: item.country || null,
      state: item.state || null,
      city: item.city || null,
      distanceMilesAway: null,
      participantLimit: item.participantLimit ?? null,
      joinedCount: item.stats?.joinedCount ?? 0,
      durationMinutes: item.durationMinutes != null ? String(item.durationMinutes) : null,
      priceType: item.priceType || (item.ticketPrice > 0 ? "paid" : "free"),
      ticketPrice: item.ticketPrice ?? 0,
      discountPercentage: item.discountPercentage ?? 0,
      imageUrl,
    };
  }

  private injectAdsIntoFeed(contentItems: any[], adItems: any[]) {
    if (!adItems.length) return contentItems;
    if (!contentItems.length) return adItems;

    const merged: any[] = [];
    let contentIndex = 0;
    let adIndex = 0;
    const interval = 3;

    while (contentIndex < contentItems.length || adIndex < adItems.length) {
      if (adIndex < adItems.length) {
        merged.push(adItems[adIndex]);
        adIndex += 1;
      }

      for (let i = 0; i < interval && contentIndex < contentItems.length; i += 1) {
        merged.push(contentItems[contentIndex]);
        contentIndex += 1;
      }
    }

    return merged;
  }
}
