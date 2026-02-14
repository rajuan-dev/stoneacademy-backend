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
  listMyGallerySchema,
  listMyRatingsSchema,
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

  getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(userIdSchema, req);
    const profile = await this.userService.getPublicProfile(
      validated.params.id,
    );
    ApiResponse.success(res, profile, "Profile fetched successfully");
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
