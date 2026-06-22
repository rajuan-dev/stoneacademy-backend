// file: src/modules/user/user.service.ts (ENHANCED VERSION)

import { EMAIL_ENABLED } from "@/config/email.config";
import { env } from "@/env";
import {
  ACCOUNT_STATUS,
  MESSAGES,
  PAGINATION,
  PARTICIPANT_STATUS,
  ROLES,
  USER_STATUS,
} from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import { Media } from "@/modules/media/media.model";
import { EmailService } from "@/services/email.service";
import { s3Service, type StorageUploadInput } from "@/services/s3.service";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { generateRandomPassword, hashPassword } from "@/utils/password.utils";
import type { IUser } from "./user.interface";
import { UserRepository } from "./user.repository";
import { Activity } from "@/modules/activity/activity.model";
import { ActivityParticipant } from "@/modules/activity/activity-participant.model";
import { Event } from "@/modules/event/event.model";
import { EventParticipant } from "@/modules/event/event-participant.model";
import { Review } from "@/modules/review/review.model";
import type {
  CleanerCreatePayload,
  CleanerCreationResult,
  PaginationQuery,
  PublicProfileResponse,
  UserCreatePayload,
  UserResponse,
} from "./user.type";

export class UserService {
  private userRepository: UserRepository;
  private emailService: EmailService;

  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
  }

  toUserResponse(user: IUser): UserResponse {
    const resolvedPhone = user.phone || user.phoneNumber;
    return {
      _id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      phone: resolvedPhone ?? null,
      phoneNumber: resolvedPhone ?? null,
      dob: user.dob,
      gender: user.gender,
      location: user.location,
      bio: user.bio || null,
      profilePhoto: user.profilePhoto
        ? user.profilePhoto.toString()
        : null,
      coverPhoto: user.coverPhoto
        ? user.coverPhoto.toString()
        : null,
      gallery: (user.gallery || []).map((id) => id.toString()),
      role: user.role,
      accountStatus: user.accountStatus,
      status: user.status,
      blockedReason: user.blockedReason,
      blockedAt: user.blockedAt,
      blockedBy: user.blockedBy ? user.blockedBy.toString() : null,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      creatorStatus: user.creatorStatus,
      rating: user.rating,
      blockedUsers: (user.blockedUsers || []).map((id) => id.toString()),
      lastLoginAt: user.lastLoginAt,
      profileImage: user.profileImageUrl || undefined,
      coverImage: user.coverImageUrl || null,
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboardingSkippedAt: user.onboardingSkippedAt,
      stripeAccountId: user.stripeAccountId || null,
      stripeCustomerId: user.stripeCustomerId || null,
      stripeOnboardingCompleted: Boolean(user.stripeOnboardingCompleted),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  getUserResponse(user: IUser): UserResponse {
    return this.toUserResponse(user);
  }

  toPublicProfile(user: IUser): PublicProfileResponse {
    return {
      _id: user._id.toString(),
      fullName: user.fullName,
      bio: user.bio || null,
      profilePhoto: user.profilePhoto
        ? user.profilePhoto.toString()
        : null,
      coverPhoto: user.coverPhoto
        ? user.coverPhoto.toString()
        : null,
      gallery: (user.gallery || []).map((id) => id.toString()),
      rating: user.rating,
    };
  }

  async updateProfilePhoto(
    userId: string,
    file: StorageUploadInput,
  ): Promise<UserResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException("Profile photo file is required");
    }

    if (!file.mimeType?.startsWith("image/")) {
      throw new BadRequestException("Profile photo must be an image");
    }

    const upload = await s3Service.uploadFile(file, {
      prefix: `profiles/${userId}`,
    });

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const media = await this.createMediaDocument(user._id.toString(), file, upload);

    user.profilePhoto = media._id;
    user.profileImageUrl = upload.url;
    await user.save();

    return this.toUserResponse(user);
  }

  async updateCoverPhoto(
    userId: string,
    file: StorageUploadInput,
  ): Promise<UserResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException("Cover photo file is required");
    }

    if (!file.mimeType?.startsWith("image/")) {
      throw new BadRequestException("Cover photo must be an image");
    }

    const upload = await s3Service.uploadFile(file, {
      prefix: `covers/${userId}`,
    });

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const media = await this.createMediaDocument(user._id.toString(), file, upload);

    user.coverPhoto = media._id;
    user.coverImageUrl = upload.url;
    await user.save();

    return this.toUserResponse(user);
  }

  async listCleaners(query: PaginationQuery) {
    const page = query.page ? Number(query.page) : PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ? Number(query.limit) : PAGINATION.DEFAULT_LIMIT;

    const filter: Record<string, any> = {
      role: ROLES.CLEANER,
    };

    if (query.status) {
      filter.accountStatus = query.status;
    }

    if (query.search) {
      const pattern = new RegExp(query.search, "i");
      filter.$or = [
        { fullName: { $regex: pattern } },
        { email: { $regex: pattern } },
      ];
    }

    const result = await this.userRepository.paginate(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      select: "-passwordHash",
    });

    return {
      data: (result.data || []).map((user) => this.toUserResponse(user as any)),
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.pageCount,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
        nextPage: result.nextPage,
        prevPage: result.prevPage,
        slNo: result.slNo,
      },
    };
  }

  async getCleanerById(cleanerId: string): Promise<UserResponse> {
    const cleaner = await this.userRepository.findOne({
      _id: cleanerId,
      role: ROLES.CLEANER,
      isDeleted: false,
    });

    if (!cleaner) {
      throw new NotFoundException("Cleaner not found");
    }

    return this.toUserResponse(cleaner);
  }

  async getUsersByIds(ids: string[]): Promise<UserResponse[]> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean))).map(String);
    if (!uniqueIds.length) return [];

    const users = await this.userRepository.find({
      _id: { $in: uniqueIds },
      isDeleted: { $ne: true },
    });

    return users.map((user) => this.toUserResponse(user as any));
  }

  async createUser(payload: UserCreatePayload): Promise<IUser> {
    const existing = await this.userRepository.findByEmail(payload.email);
    if (existing) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    const hashedPassword = payload.password
      ? await hashPassword(payload.password)
      : undefined;

    return this.userRepository.create({
      email: payload.email.toLowerCase(),
      passwordHash: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phone,
      phone: payload.phone,
      location: payload.location
        ? {
            label: payload.location.label,
            coordinates: payload.location.coordinates
              ? {
                  type: payload.location.coordinates.type || "Point",
                  coordinates: payload.location.coordinates.coordinates,
                }
              : undefined,
          }
        : undefined,
      role: payload.role,
      status: payload.status ?? USER_STATUS.ACTIVE,
      emailVerified: Boolean(payload.emailVerifiedAt),
      emailVerifiedAt: payload.emailVerifiedAt ?? null,
      accountStatus: ACCOUNT_STATUS.PENDING,
      cleanerPercentage: payload.role === ROLES.CLEANER
        ? payload.cleanerPercentage
        : undefined,
    });
  }

  async createUserWithHashedPassword(payload: {
    email: string;
    passwordHash: string;
    fullName: string;
    dob?: Date;
    role: (typeof ROLES)[keyof typeof ROLES];
    status?: (typeof USER_STATUS)[keyof typeof USER_STATUS];
    emailVerifiedAt?: Date | null;
  }): Promise<IUser> {
    const existing = await this.userRepository.findByEmail(payload.email);
    if (existing) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    return this.userRepository.create({
      email: payload.email.toLowerCase(),
      passwordHash: payload.passwordHash,
      fullName: payload.fullName,
      dob: payload.dob,
      role: payload.role,
      status: payload.status ?? USER_STATUS.ACTIVE,
      emailVerified: Boolean(payload.emailVerifiedAt),
      emailVerifiedAt: payload.emailVerifiedAt ?? null,
      accountStatus: payload.emailVerifiedAt
        ? ACCOUNT_STATUS.ACTIVE
        : ACCOUNT_STATUS.PENDING,
    });
  }

  async createCleaner(
    payload: CleanerCreatePayload
  ): Promise<CleanerCreationResult> {
    const email = payload.email.toLowerCase();
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    if (
      Number.isNaN(payload.cleanerPercentage) ||
      payload.cleanerPercentage < 0 ||
      payload.cleanerPercentage > 100
    ) {
      throw new BadRequestException("Cleaner percentage must be 0-100");
    }

    const tempPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const cleaner = await this.userRepository.create({
      email,
      passwordHash: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      address: payload.address || "N/A",
      role: ROLES.CLEANER,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      mustChangePassword: true,
      passwordAutoGenerated: true,
      cleanerPercentage: payload.cleanerPercentage,
    });

    const emailSendingEnabled = EMAIL_ENABLED && env.NODE_ENV !== "test";
    let emailSent = false;
    let emailWarning: string | undefined = emailSendingEnabled
      ? undefined
      : "Cleaner created, but email delivery is disabled. Share the credentials manually.";
    try {
      await this.emailService.sendAccountCredentials({
        to: cleaner.email,
        userName: cleaner.fullName,
        userType: cleaner.role,
        password: tempPassword,
      });
      emailSent = emailSendingEnabled;
    } catch (error) {
      emailSent = false;
      emailWarning =
        "Cleaner created, but sending login credentials via email failed.";
      logger.warn(
        { email: cleaner.email, error },
        "Failed to send cleaner credentials email"
      );
    }

    return {
      cleaner: this.toUserResponse(cleaner),
      emailSent,
      emailWarning,
      temporaryPassword: emailSent ? undefined : tempPassword,
    };
  }

  async updateCleaner(
    cleanerId: string,
    payload: Partial<CleanerCreatePayload> & { accountStatus?: string }
  ): Promise<UserResponse> {
    const cleaner = await this.userRepository.findOne({
      _id: cleanerId,
      role: ROLES.CLEANER,
      isDeleted: false,
    });

    if (!cleaner) {
      throw new NotFoundException("Cleaner not found");
    }

    if (payload.email) {
      const newEmail = payload.email.toLowerCase();
      if (newEmail !== cleaner.email) {
        const existing = await this.userRepository.findByEmail(newEmail);
        if (existing && existing._id.toString() !== cleanerId) {
          throw new ConflictException(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
        }
        cleaner.email = newEmail;
      }
    }

    if (payload.fullName) {
      cleaner.fullName = payload.fullName.trim();
    }

    if (payload.phoneNumber !== undefined) {
      cleaner.phoneNumber = payload.phoneNumber;
    }

    if (payload.address !== undefined) {
      cleaner.address = payload.address;
    }

    if (payload.cleanerPercentage !== undefined) {
      if (
        Number.isNaN(payload.cleanerPercentage) ||
        payload.cleanerPercentage < 0 ||
        payload.cleanerPercentage > 100
      ) {
        throw new BadRequestException("Cleaner percentage must be 0-100");
      }
      cleaner.cleanerPercentage = payload.cleanerPercentage;
    }

    if (payload.accountStatus) {
      cleaner.accountStatus = payload.accountStatus as (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];
    }

    await cleaner.save();
    return this.toUserResponse(cleaner);
  }

  async deleteCleaner(cleanerId: string): Promise<void> {
    const cleaner = await this.userRepository.findOne({
      _id: cleanerId,
      role: ROLES.CLEANER,
      isDeleted: false,
    });

    if (!cleaner) {
      throw new NotFoundException("Cleaner not found");
    }

    await this.userRepository.softDelete(cleanerId);
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return this.userRepository.findByEmail(email);
  }

  async getUserByEmailWithPassword(email: string): Promise<IUser | null> {
    return this.userRepository.findByEmailWithPassword(email);
  }

  async getById(userId: string): Promise<IUser | null> {
    return this.userRepository.findById(userId);
  }

  async getUserByIdWithPassword(userId: string): Promise<IUser | null> {
    return this.userRepository.findByIdWithPassword(userId);
  }

  async markEmailAsVerified(userId: string): Promise<IUser | null> {
    return this.userRepository.markEmailAsVerified(userId);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepository.updatePassword(userId, hashedPassword);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.updateLastLogin(userId);
  }

  async addRefreshTokenToBlacklist(
    userId: string,
    token: string,
    expiresAt: Date,
    reason?: string,
  ) {
    return this.userRepository.addRefreshTokenToBlacklist(userId, token, expiresAt, reason);
  }

  async isRefreshTokenBlacklisted(token: string) {
    return this.userRepository.isRefreshTokenBlacklisted(token);
  }

  async invalidateAllRefreshTokensForUser(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) return;
    user.refreshTokenInvalidBefore = new Date();
    await user.save();
  }

  async invalidateAllRefreshTokens(userId: string): Promise<void> {
    await this.userRepository.deleteAllRefreshTokens(userId);
  }

  async notifyPasswordChange(
    email: string,
    fullName: string,
    changedAt: Date
  ): Promise<void> {
    try {
      await this.emailService.sendPasswordChangeNotification({
        to: email,
        userName: fullName,
        changedAt,
      });
    } catch (error) {
      logger.warn({ email, error }, "Password change notification failed");
    }
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    return this.toUserResponse(user);
  }

  async updateProfile(
    userId: string,
    payload: {
      fullName?: string;
      email?: string;
      phone?: string;
      phoneNumber?: string;
      dob?: Date;
      gender?: string;
      bio?: string;
      location?: {
        label?: string;
        coordinates?: {
          type?: "Point";
          coordinates: [number, number];
        };
      };
    }
  ): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    if (payload.email) {
      const newEmail = payload.email.toLowerCase();
      if (newEmail !== user.email) {
        const existing = await this.userRepository.findByEmail(newEmail);
        if (existing && existing._id.toString() !== userId) {
          throw new ConflictException(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
        }
        user.email = newEmail;
        // Optional: mark as unverified on email change
        user.emailVerified = false;
        user.emailVerifiedAt = null;
      }
    }

    if (payload.fullName) {
      user.fullName = payload.fullName.trim();
    }

    const resolvedPhone = payload.phone ?? payload.phoneNumber;
    if (resolvedPhone !== undefined) {
      user.phoneNumber = resolvedPhone;
      user.phone = resolvedPhone;
    }

    if (payload.dob !== undefined) {
      user.dob = payload.dob;
    }

    if (payload.gender !== undefined) {
      user.gender = payload.gender as any;
    }

    if (payload.bio !== undefined) {
      user.bio = payload.bio.trim();
    }

    if (payload.location !== undefined) {
      if (payload.location?.coordinates?.coordinates) {
        user.location = {
          label: payload.location.label,
          coordinates: {
            type: payload.location.coordinates.type || "Point",
            coordinates: payload.location.coordinates.coordinates,
          },
        };
      } else {
        user.location = payload.location as any;
      }
    }

    await user.save();
    return this.toUserResponse(user);
  }

  async getPublicProfile(userId: string): Promise<PublicProfileResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }
    return this.toPublicProfile(user);
  }

  async getHostProfile(
    userId: string,
    query?: { page?: number; limit?: number },
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    const page = query?.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query?.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [profilePhoto, activityMediaIds, eventMediaIds, reviewRows, totalReviews] =
      await Promise.all([
        user.profilePhoto ? Media.findById(user.profilePhoto).lean() : Promise.resolve(null),
        Activity.distinct("media", { hostId: userId }),
        Event.distinct("media", { creatorId: userId }),
        Review.find({ targetUserId: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("reviewerId", "fullName profileImageUrl")
          .lean(),
        Review.countDocuments({ targetUserId: userId }),
      ]);

    const mediaIdSet = new Set<string>();
    (user.gallery || []).forEach((id) => mediaIdSet.add(id.toString()));
    (activityMediaIds || []).forEach((id: any) => mediaIdSet.add(id.toString()));
    (eventMediaIds || []).forEach((id: any) => mediaIdSet.add(id.toString()));

    const galleryItems = mediaIdSet.size
      ? await Media.find({ _id: { $in: Array.from(mediaIdSet) } })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    return {
      profile: {
        _id: user._id.toString(),
        fullName: user.fullName,
        username: user.email ? String(user.email).split("@")[0] : null,
        bio: user.bio || null,
        profilePhotoUrl: user.profileImageUrl || profilePhoto?.url || null,
        coverPhotoUrl: user.coverImageUrl || null,
        rating: {
          avg: user.rating?.avg || 0,
          count: user.rating?.count || 0,
        },
      },
      gallery: galleryItems.map((item) => ({
        _id: item._id.toString(),
        url: item.url,
        type: item.type,
        mimeType: item.mimeType,
        createdAt: item.createdAt,
      })),
      comments: reviewRows.map((review: any) => ({
        _id: review._id.toString(),
        rating: review.rating,
        tags: review.tags || [],
        comment: review.comment || null,
        targetType: review.targetType,
        targetId: review.targetId?.toString?.() || review.targetId,
        reviewer: review.reviewerId
          ? {
              _id: review.reviewerId._id?.toString?.() || null,
              fullName: review.reviewerId.fullName || null,
              profileImageUrl: review.reviewerId.profileImageUrl || null,
            }
          : null,
        createdAt: review.createdAt,
      })),
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalReviews,
        pageCount: Math.ceil(totalReviews / limit),
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1,
      },
    };
  }

  async blockUser(userId: string, targetId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    if (userId === targetId) {
      throw new BadRequestException("You cannot block yourself");
    }

    const existing = user.blockedUsers || [];
    if (!existing.map((id) => id.toString()).includes(targetId)) {
      existing.push(targetId as any);
      user.blockedUsers = existing as any;
    }

    await user.save();
    return this.toUserResponse(user);
  }

  async unblockUser(userId: string, targetId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    user.blockedUsers = (user.blockedUsers || []).filter(
      (id) => id.toString() !== targetId,
    ) as any;

    await user.save();
    return this.toUserResponse(user);
  }

  async addGallery(
    userId: string,
    files: StorageUploadInput[],
    options?: { allowedType?: "image" | "video" },
  ): Promise<UserResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException("Gallery files are required");
    }

    if (options?.allowedType) {
      const invalidFile = files.find((file) => {
        const expectedPrefix = `${options.allowedType}/`;
        return !file.mimeType?.startsWith(expectedPrefix);
      });
      if (invalidFile) {
        throw new BadRequestException(
          `Only ${options.allowedType} files are allowed for this upload`,
        );
      }
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    const uploads = await s3Service.uploadFiles(files, {
      prefix: `gallery/${userId}`,
    });

    const mediaDocs = await Media.insertMany(
      uploads.map((upload, index) => ({
        ownerId: user._id,
        type: files[index].mimeType?.startsWith("video/") ? "video" : "image",
        s3Bucket: env.AWS_S3_BUCKET,
        s3Key: upload.key,
        url: upload.url,
        mimeType: files[index].mimeType,
        sizeBytes: files[index].buffer.length,
      })),
    );

    user.gallery = [...(user.gallery || []), ...mediaDocs.map((doc) => doc._id)];
    await user.save();

    return this.toUserResponse(user);
  }

  async removeFromGallery(
    userId: string,
    mediaId: string,
  ): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    user.gallery = (user.gallery || []).filter(
      (id) => id.toString() !== mediaId,
    ) as any;

    await user.save();
    return this.toUserResponse(user);
  }

  async getMyGalleryMedia(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      source?: "activity" | "event" | "profile" | "all" | "created";
      mediaType?: "image" | "video" | "all";
    },
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    const source = query.source ?? "all";
    const mediaType = query.mediaType ?? "all";
    const includeActivity = source === "activity" || source === "all" || source === "created";
    const includeEvent = source === "event" || source === "all" || source === "created";
    const includeProfile = source === "profile" || source === "all";

    const [activityMediaIds, eventMediaIds] = await Promise.all([
      includeActivity
        ? Activity.distinct("media", { hostId: userId })
        : Promise.resolve([]),
      includeEvent
        ? Event.distinct("media", { creatorId: userId })
        : Promise.resolve([]),
    ]);

    const profileMediaIds = includeProfile
      ? [
          ...(user.gallery || []),
          ...(user.profilePhoto ? [user.profilePhoto] : []),
          ...(user.coverPhoto ? [user.coverPhoto] : []),
        ]
      : [];

    const sourceMap = new Map<string, Set<string>>();
    const addSource = (ids: Array<any>, label: string) => {
      ids
        .filter(Boolean)
        .forEach((id) => {
          const key = id.toString();
          const existing = sourceMap.get(key) ?? new Set<string>();
          existing.add(label);
          sourceMap.set(key, existing);
        });
    };

    addSource(activityMediaIds as any[], "activity");
    addSource(eventMediaIds as any[], "event");
    if (includeProfile) {
      addSource(user.gallery || [], "profile");
      if (user.profilePhoto) {
        addSource([user.profilePhoto], "profilePhoto");
      }
      if (user.coverPhoto) {
        addSource([user.coverPhoto], "coverPhoto");
      }
    }

    const allIds = Array.from(sourceMap.keys());
    if (!allIds.length) {
      return {
        data: [],
        pagination: {
          currentPage: 1,
          itemsPerPage: query.limit ?? PAGINATION.DEFAULT_LIMIT,
          totalItems: 0,
          pageCount: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const mediaFilter: Record<string, any> = { _id: { $in: allIds } };
    if (mediaType !== "all") {
      mediaFilter.type = mediaType;
    }

    const [data, totalItems] = await Promise.all([
      Media.find(mediaFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Media.countDocuments(mediaFilter),
    ]);

    return {
      data: data.map((doc) => ({
        _id: doc._id.toString(),
        url: doc.url,
        type: doc.type,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt,
        sources: Array.from(sourceMap.get(doc._id.toString()) || []),
      })),
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

  async listMyRatings(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      Review.find({ targetUserId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reviewerId", "fullName profilePhoto profileImageUrl")
        .lean(),
      Review.countDocuments({ targetUserId: userId }),
    ]);

    const formatted = data.map((review: any) => ({
      _id: review._id.toString(),
      rating: review.rating,
      comment: review.comment,
      tags: review.tags,
      targetType: review.targetType,
      targetId: review.targetId?.toString(),
      reviewer: review.reviewerId
        ? {
            _id: review.reviewerId._id?.toString(),
            fullName: review.reviewerId.fullName,
            profilePhoto: review.reviewerId.profilePhoto
              ? review.reviewerId.profilePhoto.toString()
              : null,
            profileImage: review.reviewerId.profileImageUrl || null,
          }
        : null,
      createdAt: review.createdAt,
    }));

    return {
      data: formatted,
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

  async listHostedActivities(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter = { hostId: userId };
    const [activities, totalItems] = await Promise.all([
      Activity.find(filter)
        .sort({ startAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("media", "url type mimeType")
        .lean(),
      Activity.countDocuments(filter),
    ]);

    const data = activities.map((activity: any) => ({
      _id: activity._id.toString(),
      title: activity.title,
      type: activity.type,
      description: activity.description || null,
      startAt: activity.startAt,
      endAt: activity.endAt || null,
      location: activity.location?.label || null,
      locationCoordinates: activity.location?.coordinates?.coordinates || null,
      participantLimit: activity.participantLimit ?? null,
      status: activity.status,
      stats: {
        joinedCount: activity.stats?.joinedCount ?? 0,
      },
      gallery: Array.isArray(activity.media)
        ? activity.media.map((media: any) => ({
            _id: media._id?.toString?.() || null,
            url: media.url || null,
            type: media.type || null,
            mimeType: media.mimeType || null,
          }))
        : [],
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    }));

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

  async listHostedEvents(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter = { creatorId: userId };
    const [events, totalItems] = await Promise.all([
      Event.find(filter)
        .sort({ startAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("media", "url type mimeType")
        .lean(),
      Event.countDocuments(filter),
    ]);

    const data = events.map((event: any) => {
      const ticketPrice = event.ticketPrice ?? 0;
      const discountPercentage = event.discountPercentage ?? 0;
      return {
        _id: event._id.toString(),
        title: event.title,
        type: event.type,
        description: event.description || null,
        startAt: event.startAt,
        endAt: event.endAt || null,
        location: event.location?.label || null,
        locationCoordinates: event.location?.coordinates?.coordinates || null,
        participantLimit: event.participantLimit ?? null,
        status: event.status,
        priceType: event.priceType || "free",
        ticketPrice,
        discountPercentage,
        payableTicketPrice: this.calculatePayablePrice(
          ticketPrice,
          discountPercentage,
        ),
        currency: event.currency || "USD",
        stats: {
          joinedCount: event.stats?.joinedCount ?? 0,
        },
        gallery: Array.isArray(event.media)
          ? event.media.map((media: any) => ({
              _id: media._id?.toString?.() || null,
              url: media.url || null,
              type: media.type || null,
              mimeType: media.mimeType || null,
            }))
          : [],
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      };
    });

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

  async listJoinedActivities(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter = { userId, status: PARTICIPANT_STATUS.JOINED };
    const [participants, totalItems] = await Promise.all([
      ActivityParticipant.find(filter)
        .sort({ joinedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "activityId",
          populate: [
            { path: "media", select: "url type mimeType" },
            { path: "hostId", select: "fullName email profileImageUrl rating" },
          ],
        })
        .lean(),
      ActivityParticipant.countDocuments(filter),
    ]);

    const data = participants
      .map((item: any) => {
        const activity = item.activityId;
        if (!activity?._id) return null;

        const host = activity.hostId as any;
        return {
          joinedAt: item.joinedAt || item.createdAt || null,
          activity: this.formatActivityCard(activity, host),
        };
      })
      .filter(Boolean);

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

  async listJoinedEvents(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter = { userId, status: PARTICIPANT_STATUS.JOINED };
    const [participants, totalItems] = await Promise.all([
      EventParticipant.find(filter)
        .sort({ joinedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "eventId",
          populate: [
            { path: "media", select: "url type mimeType" },
            { path: "creatorId", select: "fullName email profileImageUrl rating" },
          ],
        })
        .lean(),
      EventParticipant.countDocuments(filter),
    ]);

    const data = participants
      .map((item: any) => {
        const event = item.eventId;
        if (!event?._id) return null;

        const creator = event.creatorId as any;
        return {
          joinedAt: item.joinedAt || item.createdAt || null,
          event: this.formatEventCard(event, creator),
        };
      })
      .filter(Boolean);

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

  async getMyProfileOverview(
    userId: string,
    query?: { recentLimit?: number; mediaLimit?: number },
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    const recentLimit = query?.recentLimit ?? 10;
    const mediaLimit = query?.mediaLimit ?? 6;

    const [
      reviewCount,
      createdActivityCount,
      createdEventCount,
      joinedActivityCount,
      joinedEventCount,
      activityMediaIds,
      eventMediaIds,
      recentProfileMedia,
      recentJoinedActivities,
      recentJoinedEvents,
      recentCreatedActivities,
      recentCreatedEvents,
      recentReviews,
    ] = await Promise.all([
      Review.countDocuments({ targetUserId: userId }),
      Activity.countDocuments({ hostId: userId }),
      Event.countDocuments({ creatorId: userId }),
      ActivityParticipant.countDocuments({ userId, status: PARTICIPANT_STATUS.JOINED }),
      EventParticipant.countDocuments({ userId, status: PARTICIPANT_STATUS.JOINED }),
      Activity.distinct("media", { hostId: userId }),
      Event.distinct("media", { creatorId: userId }),
      user.gallery?.length
        ? Media.find({ _id: { $in: user.gallery } })
            .sort({ createdAt: -1 })
            .limit(recentLimit)
            .lean()
        : Promise.resolve([]),
      ActivityParticipant.find({ userId, status: PARTICIPANT_STATUS.JOINED })
        .sort({ joinedAt: -1, createdAt: -1 })
        .limit(recentLimit)
        .populate({ path: "activityId", select: "title type startAt createdAt media status" })
        .lean(),
      EventParticipant.find({ userId, status: PARTICIPANT_STATUS.JOINED })
        .sort({ joinedAt: -1, createdAt: -1 })
        .limit(recentLimit)
        .populate({ path: "eventId", select: "title type startAt createdAt media status priceType ticketPrice discountPercentage currency" })
        .lean(),
      Activity.find({ hostId: userId })
        .sort({ createdAt: -1 })
        .limit(recentLimit)
        .select("title type startAt createdAt media status")
        .lean(),
      Event.find({ creatorId: userId })
        .sort({ createdAt: -1 })
        .limit(recentLimit)
        .select("title type startAt createdAt media status priceType ticketPrice discountPercentage currency")
        .lean(),
      Review.find({ targetUserId: userId })
        .sort({ createdAt: -1 })
        .limit(recentLimit)
        .populate("reviewerId", "fullName profileImageUrl")
        .lean(),
    ]);

    const allMediaIds = new Set<string>();
    (user.gallery || []).forEach((id) => allMediaIds.add(id.toString()));
    (activityMediaIds || []).forEach((id: any) => allMediaIds.add(id.toString()));
    (eventMediaIds || []).forEach((id: any) => allMediaIds.add(id.toString()));

    const mediaMatch = { _id: { $in: Array.from(allMediaIds) } };
    const [photosCount, videosCount, mediaPreview] = allMediaIds.size
      ? await Promise.all([
          Media.countDocuments({ ...mediaMatch, type: "image" }),
          Media.countDocuments({ ...mediaMatch, type: "video" }),
          Media.find(mediaMatch)
            .sort({ createdAt: -1 })
            .limit(mediaLimit)
            .lean(),
        ])
      : [0, 0, []];

    const recentActivity = [
      ...recentProfileMedia.map((media: any) => ({
        type: media.type === "video" ? "video_uploaded" : "photo_uploaded",
        occurredAt: media.createdAt,
        title: media.type === "video" ? "Uploaded a video" : "Uploaded a photo",
        description: null,
        media: this.formatMediaItem(media),
      })),
      ...recentJoinedActivities.map((row: any) => ({
        type: "activity_joined",
        occurredAt: row.joinedAt || row.createdAt,
        title: row.activityId?.title || "Joined an activity",
        description: row.activityId?.type || null,
        target: row.activityId?._id
          ? {
              kind: "activity",
              id: row.activityId._id.toString(),
            }
          : null,
      })),
      ...recentJoinedEvents.map((row: any) => ({
        type: "event_joined",
        occurredAt: row.joinedAt || row.createdAt,
        title: row.eventId?.title || "Joined an event",
        description: row.eventId?.type || null,
        target: row.eventId?._id
          ? {
              kind: "event",
              id: row.eventId._id.toString(),
            }
          : null,
      })),
      ...recentCreatedActivities.map((row: any) => ({
        type: "activity_created",
        occurredAt: row.createdAt,
        title: row.title || "Created an activity",
        description: row.type || null,
        target: {
          kind: "activity",
          id: row._id.toString(),
        },
      })),
      ...recentCreatedEvents.map((row: any) => ({
        type: "event_created",
        occurredAt: row.createdAt,
        title: row.title || "Created an event",
        description: row.type || null,
        target: {
          kind: "event",
          id: row._id.toString(),
        },
      })),
      ...recentReviews.map((row: any) => ({
        type: "review_received",
        occurredAt: row.createdAt,
        title: "Received a review",
        description: row.comment || null,
        rating: row.rating,
        reviewer: row.reviewerId
          ? {
              id: row.reviewerId._id?.toString?.() || null,
              fullName: row.reviewerId.fullName || null,
              profileImageUrl: row.reviewerId.profileImageUrl || null,
            }
          : null,
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, recentLimit);

    return {
      profile: {
        ...this.toUserResponse(user),
      },
      socialSnapshot: {
        reviews: reviewCount,
        photos: photosCount,
        videos: videosCount,
        joinedActivities: joinedActivityCount,
        createdActivities: createdActivityCount,
        joinedEvents: joinedEventCount,
        createdEvents: createdEventCount,
      },
      metrics: {
        activity: {
          checkIns: 0,
          joined: joinedActivityCount,
          created: createdActivityCount,
          total: joinedActivityCount + createdActivityCount,
        },
        event: {
          joined: joinedEventCount,
          created: createdEventCount,
          total: joinedEventCount + createdEventCount,
        },
      },
      recentActivity: {
        total: recentActivity.length,
        items: recentActivity,
      },
      mediaPreview: {
        total: photosCount + videosCount,
        items: mediaPreview.map((media) => this.formatMediaItem(media)),
      },
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }
    user.status = USER_STATUS.DELETED;
    user.accountStatus = ACCOUNT_STATUS.INACTIVE;
    user.isDeleted = true as any;
    user.deletedAt = new Date() as any;
    await user.save();
  }

  private async createMediaDocument(
    ownerId: string,
    file: StorageUploadInput,
    upload: { key: string; url: string },
  ) {
    return Media.create({
      ownerId,
      type: file.mimeType?.startsWith("video/") ? "video" : "image",
      s3Bucket: env.AWS_S3_BUCKET,
      s3Key: upload.key,
      url: upload.url,
      mimeType: file.mimeType,
      sizeBytes: file.buffer.length,
    });
  }

  private formatMediaItem(media: any) {
    return {
      _id: media._id.toString(),
      url: media.url,
      type: media.type,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes ?? null,
      createdAt: media.createdAt,
    };
  }

  private formatActivityCard(activity: any, host?: any) {
    return {
      _id: activity._id.toString(),
      title: activity.title,
      type: activity.type,
      description: activity.description || null,
      startAt: activity.startAt,
      endAt: activity.endAt || null,
      location: activity.location?.label || null,
      locationCoordinates: activity.location?.coordinates?.coordinates || null,
      participantLimit: activity.participantLimit ?? null,
      status: activity.status,
      stats: {
        joinedCount: activity.stats?.joinedCount ?? 0,
      },
      host: host
        ? {
            _id: host._id?.toString?.() || null,
            fullName: host.fullName || null,
            username: host.email ? String(host.email).split("@")[0] : null,
            profileImageUrl: host.profileImageUrl || null,
            rating: host.rating || { avg: 0, count: 0 },
          }
        : null,
      gallery: Array.isArray(activity.media)
        ? activity.media.map((media: any) => ({
            _id: media._id?.toString?.() || null,
            url: media.url || null,
            type: media.type || null,
            mimeType: media.mimeType || null,
          }))
        : [],
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    };
  }

  private formatEventCard(event: any, creator?: any) {
    const ticketPrice = event.ticketPrice ?? 0;
    const discountPercentage = event.discountPercentage ?? 0;

    return {
      _id: event._id.toString(),
      title: event.title,
      type: event.type,
      description: event.description || null,
      startAt: event.startAt,
      endAt: event.endAt || null,
      location: event.location?.label || null,
      locationCoordinates: event.location?.coordinates?.coordinates || null,
      participantLimit: event.participantLimit ?? null,
      status: event.status,
      priceType: event.priceType || "free",
      ticketPrice,
      discountPercentage,
      payableTicketPrice: this.calculatePayablePrice(
        ticketPrice,
        discountPercentage,
      ),
      currency: event.currency || "USD",
      stats: {
        joinedCount: event.stats?.joinedCount ?? 0,
      },
      creator: creator
        ? {
            _id: creator._id?.toString?.() || null,
            fullName: creator.fullName || null,
            username: creator.email ? String(creator.email).split("@")[0] : null,
            profileImageUrl: creator.profileImageUrl || null,
            rating: creator.rating || { avg: 0, count: 0 },
          }
        : null,
      gallery: Array.isArray(event.media)
        ? event.media.map((media: any) => ({
            _id: media._id?.toString?.() || null,
            url: media.url || null,
            type: media.type || null,
            mimeType: media.mimeType || null,
          }))
        : [],
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private calculatePayablePrice(ticketPrice: number, discountPercentage: number) {
    if (ticketPrice <= 0) return 0;
    if (discountPercentage <= 0) {
      return Number(ticketPrice.toFixed(2));
    }
    const discounted = ticketPrice - (ticketPrice * discountPercentage) / 100;
    return Number(Math.max(0, discounted).toFixed(2));
  }
}
