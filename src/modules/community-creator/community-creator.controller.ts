import { MESSAGES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { UnauthorizedException } from "@/utils/app-error.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { createCommunityPostSchema } from "./community-creator.schema";
import { CommunityCreatorService } from "./community-creator.service";

export class CommunityCreatorController {
  private service: CommunityCreatorService;

  constructor() {
    this.service = new CommunityCreatorService();
  }

  createPost = asyncHandler(async (req: Request, res: Response) => {
    const locationLatitude = (req.body as Record<string, unknown>)?.["location[latitude]"];
    const locationLongitude = (req.body as Record<string, unknown>)?.["location[longitude]"];
    const locationLabel = (req.body as Record<string, unknown>)?.["location[label]"];

    if (
      req.body
      && !req.body.location
      && locationLatitude !== undefined
      && locationLongitude !== undefined
    ) {
      req.body.location = {
        latitude: locationLatitude,
        longitude: locationLongitude,
        ...(locationLabel !== undefined ? { label: locationLabel } : {}),
      };
    }

    const validated = await zParse(createCommunityPostSchema, req);
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const rawFiles = req.files as
      | Express.Multer.File[]
      | Record<string, Express.Multer.File[]>
      | undefined;

    const files = Array.isArray(rawFiles)
      ? rawFiles.filter(Boolean)
      : [
          ...(rawFiles?.media || []),
          ...(rawFiles?.mediaFiles || []),
          ...(rawFiles?.["mediaFiles[]"] || []),
          ...(rawFiles?.files || []),
        ].filter(Boolean);

    const post = await this.service.createPost({
      userId,
      body: validated.body,
      files,
    });

    ApiResponse.created(res, post, "Community post created successfully");
  });
}
