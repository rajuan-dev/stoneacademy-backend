import { ACTIVITY_STATUS, PAGINATION } from "@/constants/app.constants";
import type { FilterQuery } from "mongoose";
import { Activity } from "@/modules/activity/activity.model";
import { Event } from "@/modules/event/event.model";

const MILES_TO_METERS = 1609.34;

export class FeedService {
  async list(query: {
    q?: string;
    typeCategoryId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    lat?: number;
    lng?: number;
    radiusMiles?: number;
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
      baseFilter.$or = [{ title: pattern }, { description: pattern }];
    }

    if (query.typeCategoryId) {
      baseFilter.typeCategoryId = query.typeCategoryId;
    }

    if (query.dateFrom || query.dateTo) {
      baseFilter.startAt = {};
      if (query.dateFrom) baseFilter.startAt.$gte = query.dateFrom;
      if (query.dateTo) baseFilter.startAt.$lte = query.dateTo;
    }

    const hasGeo = query.lat !== undefined && query.lng !== undefined;
    if (hasGeo) {
      const maxDistance =
        query.radiusMiles !== undefined
          ? query.radiusMiles * MILES_TO_METERS
          : undefined;

      baseFilter["location.coordinates"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [query.lng, query.lat],
          },
          ...(maxDistance ? { $maxDistance: maxDistance } : {}),
        },
      };
    }

    const [activities, events] = await Promise.all([
      Activity.find(baseFilter).limit(limit * 2).exec(),
      Event.find(baseFilter).limit(limit * 2).exec(),
    ]);

    const merged = [
      ...activities.map((item) => ({ kind: "activity", item })),
      ...events.map((item) => ({ kind: "event", item })),
    ].sort((a, b) => {
      const aTime = new Date(a.item.startAt).getTime();
      const bTime = new Date(b.item.startAt).getTime();
      return aTime - bTime;
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
}
