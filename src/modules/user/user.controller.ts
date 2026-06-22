// file: src/modules/user/user.controller.ts

import { MESSAGES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import {
  BadRequestException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import type { StorageUploadInput } from "@/services/s3.service";
import {
  cleanerIdSchema,
  createCleanerSchema,
  galleryRemoveSchema,
  listCleanersSchema,
  listJoinedContentSchema,
  listMyGallerySchema,
  listMyRatingsSchema,
  listOverviewSchema,
  listHostedContentSchema,
  hostProfileSchema,
  userIdSchema,
  updateCleanerSchema,
  updateProfileSchema,
} from "./user.schema";
import { UserService } from "./user.service";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  listCleaners = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listCleanersSchema, req);
    const result = await this.userService.listCleaners(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Cleaners fetched successfully"
    );
  });

  getCleaner = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(cleanerIdSchema, req);
    const cleaner = await this.userService.getCleanerById(
      validated.params.cleanerId
    );
    ApiResponse.success(res, cleaner, "Cleaner fetched successfully");
  });

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }
    const profile = await this.userService.getProfile(userId);
    ApiResponse.success(res, profile, "Profile fetched successfully");
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const file = req.file;
    const rawBody = (req.body || {}) as Record<string, unknown>;
    const normalizedBody: Record<string, unknown> = {};
    const allowedProfileKeys = new Set([
      "fullName",
      "email",
      "phone",
      "phoneNumber",
      "dob",
      "gender",
      "bio",
      "location",
    ]);

    Object.entries(rawBody).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        normalizedBody[key] = value[0];
        return;
      }
      normalizedBody[key] = value;
    });

    const profileBody: Record<string, unknown> = {};
    Object.keys(normalizedBody).forEach((key) => {
      if (!allowedProfileKeys.has(key)) return;
      profileBody[key] = normalizedBody[key];
    });

    const bodyKeys = Object.keys(profileBody).filter((key) => {
      const value = profileBody[key];
      return value !== undefined && value !== null && String(value).trim() !== "";
    });

    if (!bodyKeys.length && !file) {
      throw new BadRequestException(
        "At least one profile field or photo is required",
      );
    }

    if (typeof profileBody.location === "string") {
      try {
        profileBody.location = JSON.parse(profileBody.location);
      } catch {
        throw new BadRequestException("location must be a valid JSON object");
      }
    }

    let profile = await this.userService.getProfile(userId);

    if (bodyKeys.length) {
      const validated = await updateProfileSchema.parseAsync({
        body: profileBody,
      });
      profile = await this.userService.updateProfile(userId, validated.body);
    }

    if (file) {
      const uploadInput: StorageUploadInput = {
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
      };
      profile = await this.userService.updateProfilePhoto(userId, uploadInput);
    }

    ApiResponse.success(res, profile, "Profile updated successfully");
  });

  uploadProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const file = req.file;
    if (!file) {
      throw new BadRequestException("Profile photo file is required");
    }

    const uploadInput: StorageUploadInput = {
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };

    const profile = await this.userService.updateProfilePhoto(
      userId,
      uploadInput,
    );

    ApiResponse.success(res, profile, "Profile photo updated successfully");
  });

  uploadCoverPhoto = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const file = req.file;
    if (!file) {
      throw new BadRequestException("Cover photo file is required");
    }

    const uploadInput: StorageUploadInput = {
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };

    const profile = await this.userService.updateCoverPhoto(
      userId,
      uploadInput,
    );

    ApiResponse.success(res, profile, "Cover photo updated successfully");
  });

  uploadGallery = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      throw new BadRequestException("Gallery files are required");
    }

    const uploads: StorageUploadInput[] = files.map((file) => ({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    }));

    const profile = await this.userService.addGallery(userId, uploads);
    ApiResponse.success(res, profile, "Gallery updated successfully");
  });

  removeGalleryItem = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(galleryRemoveSchema, req);
    const profile = await this.userService.removeFromGallery(
      userId,
      validated.params.mediaId,
    );

    ApiResponse.success(res, profile, "Gallery item removed successfully");
  });

  getMyGallery = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(listMyGallerySchema, req);
    const result = await this.userService.getMyGalleryMedia(
      userId,
      validated.query,
    );
    ApiResponse.paginated(res, result.data, result.pagination, "Gallery fetched successfully");
  });

  getMyPhotos = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(listMyGallerySchema, req);
    const result = await this.userService.getMyGalleryMedia(userId, {
      ...validated.query,
      mediaType: "image",
    });
    ApiResponse.paginated(res, result.data, result.pagination, "Photos fetched successfully");
  });

  getMyVideos = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(listMyGallerySchema, req);
    const result = await this.userService.getMyGalleryMedia(userId, {
      ...validated.query,
      mediaType: "video",
    });
    ApiResponse.paginated(res, result.data, result.pagination, "Videos fetched successfully");
  });

  uploadMyVideos = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      throw new BadRequestException("Video files are required");
    }

    const uploads: StorageUploadInput[] = files.map((file) => ({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    }));

    const profile = await this.userService.addGallery(userId, uploads, {
      allowedType: "video",
    });
    ApiResponse.success(res, profile, "Videos uploaded successfully");
  });

  getMyRatings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(listMyRatingsSchema, req);
    const result = await this.userService.listMyRatings(
      userId,
      validated.query,
    );
    ApiResponse.paginated(res, result.data, result.pagination, "Ratings fetched successfully");
  });

  getMyHostedActivities = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(listHostedContentSchema, req);
    const result = await this.userService.listHostedActivities(
      userId,
      validated.query,
    );
    ApiResponse.paginated(res, result.data, result.pagination, "Hosted activities fetched successfully");
  });

  getMyHostedEvents = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(listHostedContentSchema, req);
    const result = await this.userService.listHostedEvents(
      userId,
      validated.query,
    );
    ApiResponse.paginated(res, result.data, result.pagination, "Hosted events fetched successfully");
  });

  getMyJoinedActivities = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(listJoinedContentSchema, req);
    const result = await this.userService.listJoinedActivities(
      userId,
      validated.query,
    );
    ApiResponse.paginated(res, result.data, result.pagination, "Joined activities fetched successfully");
  });

  getMyJoinedEvents = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(listJoinedContentSchema, req);
    const result = await this.userService.listJoinedEvents(
      userId,
      validated.query,
    );
    ApiResponse.paginated(res, result.data, result.pagination, "Joined events fetched successfully");
  });

  getMyOverview = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(listOverviewSchema, req);
    const result = await this.userService.getMyProfileOverview(
      userId,
      validated.query,
    );
    ApiResponse.success(res, result, "Profile overview fetched successfully");
  });

  getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(userIdSchema, req);
    const profile = await this.userService.getPublicProfile(
      validated.params.id,
    );
    ApiResponse.success(res, profile, "Profile fetched successfully");
  });

  getHostProfile = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(hostProfileSchema, req);
    const result = await this.userService.getHostProfile(
      validated.params.id,
      validated.query,
    );
    ApiResponse.success(res, result, "Host profile fetched successfully");
  });

  blockUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(userIdSchema, req);
    const profile = await this.userService.blockUser(
      userId,
      validated.params.id,
    );
    ApiResponse.success(res, profile, "User blocked successfully");
  });

  unblockUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }

    const validated = await zParse(userIdSchema, req);
    const profile = await this.userService.unblockUser(
      userId,
      validated.params.id,
    );
    ApiResponse.success(res, profile, "User unblocked successfully");
  });

  createCleaner = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createCleanerSchema, req);
    const result = await this.userService.createCleaner(validated.body);
    const message = result.emailSent
      ? "Cleaner created successfully"
      : "Cleaner created, but email delivery failed";
    ApiResponse.created(res, result, message);
  });

  updateCleaner = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateCleanerSchema, req);
    const cleaner = await this.userService.updateCleaner(
      validated.params.cleanerId,
      validated.body
    );
    ApiResponse.success(res, cleaner, "Cleaner updated successfully");
  });

  deleteCleaner = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(cleanerIdSchema, req);
    await this.userService.deleteCleaner(validated.params.cleanerId);
    ApiResponse.success(res, { message: "Cleaner deleted successfully" });
  });

  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
    }
    await this.userService.deleteAccount(userId);
    ApiResponse.success(res, { message: "Account deleted successfully" });
  });
}
