import { PAGINATION } from "@/constants/app.constants";
import { BadRequestException, NotFoundException } from "@/utils/app-error.utils";
import { s3Service, type StorageUploadInput } from "@/services/s3.service";
import {
  buildGeographyFilter,
  getUserGeography,
  normalizeGeography,
} from "@/utils/geography.utils";
import { Ad } from "./ads.model";

export class AdsService {
  async list(query: { page?: number; limit?: number; status?: "active" | "expired" }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.status) filter.status = query.status;

    const [data, totalItems] = await Promise.all([
      Ad.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
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

  async listActive(query?: {
    viewerUserId?: string;
    state?: string;
    city?: string;
  }) {
    const viewerGeography = await getUserGeography(query?.viewerUserId);
    return this.listActiveByGeography({
      country: viewerGeography.country,
      state: query?.state,
      city: query?.city,
    });
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
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(payload: {
    name: string;
    category?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    linkUrl: string;
    country: string;
    state?: string;
    city?: string;
    status?: "active" | "expired";
  }, image?: StorageUploadInput) {
    const upload = image
      ? await this.uploadAdImage(image, payload.country)
      : null;
    return Ad.create({
      name: payload.name,
      category: payload.category,
      description: payload.description,
      price: payload.price ?? 0,
      imageUrl: upload?.url || payload.imageUrl,
      linkUrl: payload.linkUrl,
      ...normalizeGeography({
        country: payload.country,
        state: payload.state,
        city: payload.city,
      }),
      status: payload.status ?? "active",
    });
  }

  async update(
    id: string,
    payload: {
      name?: string;
      category?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      linkUrl?: string;
      country?: string;
      state?: string;
      city?: string;
      status?: "active" | "expired";
    },
    image?: StorageUploadInput,
  ) {
    const ad = await Ad.findById(id).exec();
    if (!ad) throw new NotFoundException("Ad not found");

    if (payload.name !== undefined) ad.name = payload.name;
    if (payload.category !== undefined) ad.category = payload.category;
    if (payload.description !== undefined) ad.description = payload.description;
    if (payload.price !== undefined) ad.price = payload.price;
    if (payload.imageUrl !== undefined) ad.imageUrl = payload.imageUrl;
    if (payload.linkUrl !== undefined) ad.linkUrl = payload.linkUrl;
    const geography = normalizeGeography(payload);
    if (payload.country !== undefined) ad.country = geography.country!;
    if (payload.state !== undefined) ad.state = geography.state;
    if (payload.city !== undefined) ad.city = geography.city;
    if (payload.status !== undefined) ad.status = payload.status;
    if (image) {
      const upload = await this.uploadAdImage(image, payload.country ?? ad.country);
      ad.imageUrl = upload.url;
    }
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

  private async uploadAdImage(file: StorageUploadInput, country?: string) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Ad image file is missing");
    }
    if (!file.mimeType?.startsWith("image/")) {
      throw new BadRequestException("Ad image must be an image file");
    }
    const prefix = `ads/${this.slugifySegment(country)}`;
    return s3Service.uploadFile(file, { prefix });
  }

  private slugifySegment(value?: string) {
    const base = value?.trim().toLowerCase() || "general";
    return base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "general";
  }
}
