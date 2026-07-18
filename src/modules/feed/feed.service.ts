import { PAGINATION } from "@/constants/app.constants";
import { ActivityService } from "@/modules/activity/activity.service";
import { Ad } from "@/modules/ads/ads.model";
import { EventService } from "@/modules/event/event.service";
import {
  buildGeographyFilter,
  getUserGeography,
} from "@/utils/geography.utils";
import type { FilterQuery } from "mongoose";

export class FeedService {
  private activityService: ActivityService;
  private eventService: EventService;

  constructor() {
    this.activityService = new ActivityService();
    this.eventService = new EventService();
  }

  async list(query: {
    q?: string;
    state?: string;
    city?: string;
    paid?: "all" | "free" | "paid";
    sort?: "distance" | "time" | "popular" | "recent";
    lat?: number;
    lng?: number;
    radius?: number;
    radiusUnit?: "km" | "mile" | "miles";
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

    const adFilter: FilterQuery<any> = {
      status: "active",
      ...geographyFilter,
    };

    if (query.q) {
      adFilter.name = new RegExp(query.q, "i");
    }

    const hasGeo = query.lat !== undefined && query.lng !== undefined;
    const sharedRadiusMiles = this.toMiles(query.radius, query.radiusUnit);
    const sharedSort = this.toSharedSort(query.sort);

    const [activityResult, eventResult, ads] = await Promise.all([
      this.activityService.list({
        q: query.q,
        state: query.state,
        city: query.city,
        lat: query.lat,
        lng: query.lng,
        radiusMiles: sharedRadiusMiles,
        sort: sharedSort,
        page: 1,
        limit: limit * 2,
        viewerUserId: query.userId,
      }),
      this.eventService.list({
        q: query.q,
        state: query.state,
        city: query.city,
        lat: query.lat,
        lng: query.lng,
        radiusMiles: sharedRadiusMiles,
        paid: query.paid === "all" ? undefined : query.paid,
        sort: sharedSort,
        page: 1,
        limit: limit * 2,
        viewerUserId: query.userId,
      }),
      Ad.find(adFilter).sort({ createdAt: -1 }).limit(limit * 2).exec(),
    ]);

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
      ...activityResult.data,
      ...eventResult.data,
    ];

    this.sortContentItems(contentItems, query.sort, hasGeo);

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

  async searchFilter(query: {
    kind?: "all" | "activity" | "event" | "ad";
    type?: string;
    date?: Date;
    paid?: "all" | "free" | "paid";
    state?: string;
    city?: string;
    sort?: "distance" | "time" | "popular" | "recent";
    lat?: number;
    lng?: number;
    radius?: number;
    radiusUnit?: "km" | "mile" | "miles";
    userId: string;
  }) {
    const page = PAGINATION.DEFAULT_PAGE;
    const limit = PAGINATION.DEFAULT_LIMIT;
    const viewerGeography = await getUserGeography(query.userId);
    const geographyFilter = buildGeographyFilter({
      country: viewerGeography.country,
      state: query.state,
      city: query.city,
    });

    const adFilter: FilterQuery<any> = {
      status: "active",
      ...geographyFilter,
    };

    if (query.type && query.type.toLowerCase() !== "all") {
      adFilter.name = new RegExp(query.type, "i");
    }

    const includeActivities = !query.kind || query.kind === "all" || query.kind === "activity";
    const includeEvents = !query.kind || query.kind === "all" || query.kind === "event";
    const includeAds = !query.kind || query.kind === "all" || query.kind === "ad";
    const hasGeo = query.lat !== undefined && query.lng !== undefined;
    const sharedRadiusMiles = this.toMiles(query.radius, query.radiusUnit);
    const sharedSort = this.toSharedSort(query.sort);
    const dateFrom = query.date
      ? new Date(new Date(query.date).setHours(0, 0, 0, 0))
      : undefined;
    const dateTo = query.date
      ? new Date(new Date(query.date).setHours(23, 59, 59, 999))
      : undefined;

    const [activityResult, eventResult, ads] = await Promise.all([
      includeActivities
        ? this.activityService.list({
            type: query.type,
            dateFrom,
            dateTo,
            state: query.state,
            city: query.city,
            lat: query.lat,
            lng: query.lng,
            radiusMiles: sharedRadiusMiles,
            sort: sharedSort,
            page: 1,
            limit: 100,
            viewerUserId: query.userId,
          })
        : Promise.resolve({ data: [] as any[] }),
      includeEvents
        ? this.eventService.list({
            type: query.type,
            dateFrom,
            dateTo,
            state: query.state,
            city: query.city,
            lat: query.lat,
            lng: query.lng,
            radiusMiles: sharedRadiusMiles,
            paid: query.paid === "all" ? undefined : query.paid,
            sort: sharedSort,
            page: 1,
            limit: 100,
            viewerUserId: query.userId,
          })
        : Promise.resolve({ data: [] as any[] }),
      includeAds
        ? Ad.find(adFilter).sort({ createdAt: -1 }).limit(100).exec()
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
        startAt: item.createdAt,
        createdAt: item.createdAt,
      })),
      ...activityResult.data,
      ...eventResult.data,
    ];

    this.sortSearchItems(merged, query.sort, hasGeo);

    return {
      data: merged.slice(0, limit),
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: merged.length,
        pageCount: Math.ceil(merged.length / limit),
        hasNext: page * limit < merged.length,
        hasPrev: page > 1,
      },
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
      for (let i = 0; i < interval && contentIndex < contentItems.length; i += 1) {
        merged.push(contentItems[contentIndex]);
        contentIndex += 1;
      }

      if (adIndex < adItems.length) {
        merged.push(adItems[adIndex]);
        adIndex += 1;
      }
    }

    return merged;
  }

  private sortContentItems(
    items: any[],
    sort?: "distance" | "time" | "popular" | "recent",
    hasGeo?: boolean,
  ) {
    if (sort === "time") {
      items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      return;
    }

    if (sort === "popular") {
      items.sort((a, b) => (b.joinedCount ?? 0) - (a.joinedCount ?? 0));
      return;
    }

    if (sort === "distance" && hasGeo) {
      items.sort((a, b) => {
        const aDistance = Number(a.distanceMilesAway ?? Number.MAX_SAFE_INTEGER);
        const bDistance = Number(b.distanceMilesAway ?? Number.MAX_SAFE_INTEGER);
        return aDistance - bDistance;
      });
      return;
    }

    items.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }

  private sortSearchItems(
    items: any[],
    sort?: "distance" | "time" | "popular" | "recent",
    hasGeo?: boolean,
  ) {
    if (sort === "distance" && hasGeo) {
      items.sort((a, b) => {
        const aDistance = Number(a.distanceMilesAway ?? Number.MAX_SAFE_INTEGER);
        const bDistance = Number(b.distanceMilesAway ?? Number.MAX_SAFE_INTEGER);
        return aDistance - bDistance;
      });
      return;
    }

    if (sort === "popular") {
      items.sort((a, b) => (b.joinedCount ?? 0) - (a.joinedCount ?? 0));
      return;
    }

    if (sort === "recent") {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return;
    }

    items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }

  private toMiles(radius?: number, radiusUnit?: "km" | "mile" | "miles") {
    if (!radius || radius <= 0) return undefined;
    if (radiusUnit === "km") {
      return Number((radius * 0.621371).toFixed(4));
    }
    return radius;
  }

  private toSharedSort(sort?: "distance" | "time" | "popular" | "recent") {
    if (!sort || sort === "recent") return undefined;
    return sort;
  }
}
