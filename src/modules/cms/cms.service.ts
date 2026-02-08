import { PAGINATION } from "@/constants/app.constants";
import { ConflictException, NotFoundException } from "@/utils/app-error.utils";
import { CmsPage } from "./cms.model";

export class CmsService {
  async list(query: { page?: number; limit?: number }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      CmsPage.find({}).sort({ updatedAt: -1 }).skip(skip).limit(limit).exec(),
      CmsPage.countDocuments({}),
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

  async getBySlug(slug: string) {
    const page = await CmsPage.findOne({ slug: slug.toLowerCase() }).exec();
    if (!page) {
      throw new NotFoundException("Page not found");
    }
    return page;
  }

  async create(payload: { slug: string; title: string; content: string }, adminId: string) {
    const existing = await CmsPage.findOne({ slug: payload.slug.toLowerCase() }).exec();
    if (existing) {
      throw new ConflictException("Slug already exists");
    }
    return CmsPage.create({
      slug: payload.slug.toLowerCase(),
      title: payload.title,
      content: payload.content,
      updatedBy: adminId,
    });
  }

  async update(slug: string, payload: { title?: string; content?: string }, adminId: string) {
    const page = await CmsPage.findOne({ slug: slug.toLowerCase() }).exec();
    if (!page) {
      throw new NotFoundException("Page not found");
    }
    if (payload.title !== undefined) page.title = payload.title;
    if (payload.content !== undefined) page.content = payload.content;
    page.version = (page.version || 1) + 1;
    page.updatedBy = adminId as any;
    await page.save();
    return page;
  }

  async remove(slug: string) {
    const result = await CmsPage.deleteOne({ slug: slug.toLowerCase() }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException("Page not found");
    }
    return { deleted: true };
  }
}
