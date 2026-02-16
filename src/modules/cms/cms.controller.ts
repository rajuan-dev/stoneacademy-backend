import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  cmsSlugSchema,
  createCmsPageSchema,
  listCmsPagesSchema,
  upsertStaticCmsContentSchema,
  updateCmsPageSchema,
} from "./cms.schema";
import { CmsService } from "./cms.service";

export class CmsController {
  private service: CmsService;

  constructor() {
    this.service = new CmsService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listCmsPagesSchema, req);
    const result = await this.service.list(validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Pages fetched");
  });

  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(cmsSlugSchema, req);
    const page = await this.service.getBySlug(validated.params.slug);
    ApiResponse.success(res, page, "Page fetched");
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createCmsPageSchema, req);
    const adminId = req.user?.userId as string;
    const page = await this.service.create(validated.body, adminId);
    ApiResponse.created(res, page, "Page created");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateCmsPageSchema, req);
    const adminId = req.user?.userId as string;
    const page = await this.service.update(
      validated.params.slug,
      validated.body,
      adminId,
    );
    ApiResponse.success(res, page, "Page updated");
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(cmsSlugSchema, req);
    const result = await this.service.remove(validated.params.slug);
    ApiResponse.success(res, result, "Page deleted");
  });

  getAboutUs = asyncHandler(async (_req: Request, res: Response) => {
    const page = await this.service.getAboutUsPage();
    ApiResponse.success(res, page, "About Us fetched");
  });

  getPrivacyPolicy = asyncHandler(async (_req: Request, res: Response) => {
    const page = await this.service.getPrivacyPolicyPage();
    ApiResponse.success(res, page, "Privacy Policy fetched");
  });

  getTermsAndConditions = asyncHandler(async (_req: Request, res: Response) => {
    const page = await this.service.getTermsAndConditionsPage();
    ApiResponse.success(res, page, "Terms and Conditions fetched");
  });

  upsertAboutUs = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(upsertStaticCmsContentSchema, req);
    const adminId = req.user?.userId as string;
    const page = await this.service.upsertAboutUsPage(validated.body.content, adminId);
    ApiResponse.success(res, page, "About Us updated");
  });

  upsertPrivacyPolicy = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(upsertStaticCmsContentSchema, req);
    const adminId = req.user?.userId as string;
    const page = await this.service.upsertPrivacyPolicyPage(
      validated.body.content,
      adminId,
    );
    ApiResponse.success(res, page, "Privacy Policy updated");
  });

  upsertTermsAndConditions = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(upsertStaticCmsContentSchema, req);
    const adminId = req.user?.userId as string;
    const page = await this.service.upsertTermsAndConditionsPage(
      validated.body.content,
      adminId,
    );
    ApiResponse.success(res, page, "Terms and Conditions updated");
  });
}
