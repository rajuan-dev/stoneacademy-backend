import { env } from "@/env";
import type { UserResponse } from "@/modules/user/user.type";
import { Media } from "@/modules/media/media.model";
import { s3Service, type StorageUploadInput } from "@/services/s3.service";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { AdminAccount, AdminRefreshTokenBlacklist } from "./admin-account.model";
import type { IAdminAccount } from "./admin-account.interface";

export class AdminAccountService {
  async findByEmailWithPassword(email: string): Promise<IAdminAccount | null> {
    return AdminAccount.findOne({ email: email.toLowerCase().trim() })
      .select("+passwordHash")
      .exec();
  }

  async findByEmail(email: string): Promise<IAdminAccount | null> {
    return AdminAccount.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async getById(adminId: string): Promise<IAdminAccount | null> {
    return AdminAccount.findById(adminId).exec();
  }

  async getByIdWithPassword(adminId: string): Promise<IAdminAccount | null> {
    return AdminAccount.findById(adminId).select("+passwordHash").exec();
  }

  async markLastLogin(adminId: string): Promise<void> {
    await AdminAccount.findByIdAndUpdate(adminId, { lastLoginAt: new Date() }).exec();
  }

  toUserResponse(admin: IAdminAccount): UserResponse {
    const phone = admin.phoneNumber || admin.contactNo || null;
    return {
      _id: admin._id.toString(),
      email: admin.email,
      fullName: admin.fullName,
      phone,
      phoneNumber: phone,
      profilePhoto: admin.profilePhoto ? admin.profilePhoto.toString() : null,
      gallery: [],
      role: admin.role,
      accountStatus: admin.accountStatus,
      status: admin.status,
      blockedUsers: [],
      emailVerified: admin.emailVerified,
      emailVerifiedAt: admin.emailVerifiedAt ?? null,
      lastLoginAt: admin.lastLoginAt ?? undefined,
      profileImage: admin.profileImageUrl || undefined,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    } as UserResponse;
  }

  toProfileSummary(admin: IAdminAccount) {
    return {
      profilePhoto: admin.profileImageUrl || null,
      name: admin.fullName,
      email: admin.email,
      contactNo: admin.phoneNumber || admin.contactNo || null,
    };
  }

  async updateProfile(
    adminId: string,
    payload: {
      fullName?: string;
      email?: string;
      phone?: string;
      contactNo?: string;
      phoneNumber?: string;
    },
  ): Promise<IAdminAccount> {
    const admin = await AdminAccount.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException("Admin account not found");
    }

    if (payload.email) {
      const normalized = payload.email.toLowerCase().trim();
      if (normalized !== admin.email) {
        const exists = await this.findByEmail(normalized);
        if (exists && exists._id.toString() !== adminId) {
          throw new ConflictException("Admin email already exists");
        }
        admin.email = normalized;
      }
    }

    if (payload.fullName) {
      admin.fullName = payload.fullName.trim();
    }

    const phoneValue = payload.phone ?? payload.contactNo ?? payload.phoneNumber;
    if (phoneValue !== undefined) {
      admin.phoneNumber = phoneValue;
      admin.contactNo = phoneValue;
    }

    await admin.save();
    return admin;
  }

  async updateProfilePhoto(
    adminId: string,
    file: StorageUploadInput,
  ): Promise<IAdminAccount> {
    if (!file || !file.buffer) {
      throw new BadRequestException("Profile photo file is required");
    }

    if (!file.mimeType?.startsWith("image/")) {
      throw new BadRequestException("Profile photo must be an image");
    }

    const upload = await s3Service.uploadFile(file, {
      prefix: `admins/${adminId}`,
    });

    const admin = await AdminAccount.findById(adminId).exec();
    if (!admin) {
      throw new NotFoundException("Admin account not found");
    }

    const previousPhotoId = admin.profilePhoto ? admin.profilePhoto.toString() : null;
    const previousPhotoUrl = admin.profileImageUrl || null;

    const media = await Media.create({
      ownerId: admin._id,
      ownerModel: "Admin",
      type: "image",
      s3Bucket: env.AWS_S3_BUCKET,
      s3Key: upload.key,
      url: upload.url,
      mimeType: file.mimeType,
      sizeBytes: file.buffer.length,
    });

    admin.profilePhoto = media._id;
    admin.profileImageUrl = upload.url;
    await admin.save();

    if (previousPhotoId) {
      await this.removeMediaAsset(previousPhotoId);
    }
    if (!previousPhotoId && previousPhotoUrl && previousPhotoUrl !== upload.url) {
      const previousKey = this.extractS3KeyFromUrl(previousPhotoUrl);
      if (previousKey) {
        await this.safeDeleteS3Object(previousKey);
      }
    }

    return admin;
  }

  async updatePassword(adminId: string, passwordHash: string): Promise<void> {
    const updated = await AdminAccount.findByIdAndUpdate(
      adminId,
      {
        passwordHash,
        updatedAt: new Date(),
      },
      { new: true },
    ).exec();

    if (!updated) {
      throw new NotFoundException("Admin account not found");
    }
  }

  async addRefreshTokenToBlacklist(
    adminId: string,
    token: string,
    expiresAt: Date,
    reason?: string,
  ): Promise<void> {
    await AdminRefreshTokenBlacklist.create({
      adminId,
      token,
      expiresAt,
      reason: reason || "logout",
    });
  }

  async isRefreshTokenBlacklisted(token: string): Promise<boolean> {
    const existing = await AdminRefreshTokenBlacklist.findOne({ token })
      .select("_id")
      .lean()
      .exec();
    return Boolean(existing);
  }

  async invalidateAllRefreshTokens(adminId: string): Promise<void> {
    await AdminRefreshTokenBlacklist.deleteMany({ adminId }).exec();
  }

  private async removeMediaAsset(mediaId: string): Promise<void> {
    const media = await Media.findById(mediaId).exec();
    if (!media) return;

    if (media.s3Key) {
      await this.safeDeleteS3Object(media.s3Key);
    }

    await Media.deleteOne({ _id: media._id }).exec();
  }

  private async safeDeleteS3Object(key: string): Promise<void> {
    try {
      await s3Service.deleteFile(key);
    } catch {
      // Keep profile update successful even if storage cleanup fails.
    }
  }

  private extractS3KeyFromUrl(url: string): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.replace(/^\/+/, "");
      return pathname || null;
    } catch {
      return null;
    }
  }
}
