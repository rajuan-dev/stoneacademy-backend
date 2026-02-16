import { PAGINATION } from "@/constants/app.constants";
import { ConflictException, NotFoundException } from "@/utils/app-error.utils";
import { CmsPage } from "./cms.model";

const STATIC_CMS_SLUGS = {
  ABOUT_US: "about-us",
  PRIVACY_POLICY: "privacy-policy",
  TERMS_AND_CONDITIONS: "terms-and-conditions",
} as const;

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

  async getAboutUsPage() {
    return this.getBySlug(STATIC_CMS_SLUGS.ABOUT_US);
  }

  async getPrivacyPolicyPage() {
    return this.getBySlug(STATIC_CMS_SLUGS.PRIVACY_POLICY);
  }

  async getTermsAndConditionsPage() {
    return this.getBySlug(STATIC_CMS_SLUGS.TERMS_AND_CONDITIONS);
  }

  async upsertAboutUsPage(content: string, adminId: string) {
    return this.upsertStaticPage(
      STATIC_CMS_SLUGS.ABOUT_US,
      "About Us",
      content,
      adminId,
    );
  }

  async upsertPrivacyPolicyPage(content: string, adminId: string) {
    return this.upsertStaticPage(
      STATIC_CMS_SLUGS.PRIVACY_POLICY,
      "Privacy Policy",
      content,
      adminId,
    );
  }

  async upsertTermsAndConditionsPage(content: string, adminId: string) {
    return this.upsertStaticPage(
      STATIC_CMS_SLUGS.TERMS_AND_CONDITIONS,
      "Terms and Conditions",
      content,
      adminId,
    );
  }

  private async upsertStaticPage(
    slug: string,
    title: string,
    content: string,
    adminId: string,
  ) {
    const existing = await CmsPage.findOne({ slug }).exec();
    if (!existing) {
      return CmsPage.create({
        slug,
        title,
        content,
        version: 1,
        updatedBy: adminId,
      });
    }

    existing.title = title;
    existing.content = content;
    existing.version = (existing.version || 1) + 1;
    existing.updatedBy = adminId as any;
    await existing.save();
    return existing;
  }
}
