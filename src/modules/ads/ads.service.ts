import { PAGINATION } from "@/constants/app.constants";
import { NotFoundException } from "@/utils/app-error.utils";
import { buildGeographyFilter, normalizeGeography } from "@/utils/geography.utils";
import { Ad } from "./ads.model";

export class AdsService {
  async list(query: { page?: number; limit?: number; status?: "active" | "expired" }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.status) filter.status = query.status;

    const [data, totalItems] = await Promise.all([
      Ad.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).exec(),
      Ad.countDocuments(filter),
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

  async listActive() {
    return this.listActiveByGeography({});
  }

  async listActiveByGeography(geography: {
    country?: string;
    state?: string;
    city?: string;
  }) {
    const now = new Date();
    return Ad.find({
      status: "active",
      ...buildGeographyFilter(geography),
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
      ],
    })
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async create(payload: {
    name: string;
    imageUrl: string;
    linkUrl: string;
    country: string;
    state?: string;
    city?: string;
    status?: "active" | "expired";
    startsAt?: Date;
    endsAt?: Date;
    order?: number;
  }) {
    return Ad.create({
      name: payload.name,
      imageUrl: payload.imageUrl,
      linkUrl: payload.linkUrl,
      ...normalizeGeography({
        country: payload.country,
        state: payload.state,
        city: payload.city,
      }),
      status: payload.status ?? "active",
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      order: payload.order ?? 0,
    });
  }

  async update(
    id: string,
    payload: {
      name?: string;
      imageUrl?: string;
      linkUrl?: string;
      country?: string;
      state?: string;
      city?: string;
      status?: "active" | "expired";
      startsAt?: Date;
      endsAt?: Date;
      order?: number;
    },
  ) {
    const ad = await Ad.findById(id).exec();
    if (!ad) throw new NotFoundException("Ad not found");

    if (payload.name !== undefined) ad.name = payload.name;
    if (payload.imageUrl !== undefined) ad.imageUrl = payload.imageUrl;
    if (payload.linkUrl !== undefined) ad.linkUrl = payload.linkUrl;
    const geography = normalizeGeography(payload);
    if (payload.country !== undefined) ad.country = geography.country!;
    if (payload.state !== undefined) ad.state = geography.state;
    if (payload.city !== undefined) ad.city = geography.city;
    if (payload.status !== undefined) ad.status = payload.status;
    if (payload.startsAt !== undefined) ad.startsAt = payload.startsAt;
    if (payload.endsAt !== undefined) ad.endsAt = payload.endsAt;
    if (payload.order !== undefined) ad.order = payload.order;
    await ad.save();
    return ad;
  }

  async remove(id: string) {
    const result = await Ad.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException("Ad not found");
    }
    return { deleted: true };
  }
}
