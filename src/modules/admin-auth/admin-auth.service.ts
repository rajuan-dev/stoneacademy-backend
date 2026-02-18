// file: src/modules/admin-auth/admin-auth.service.ts

import type { StorageUploadInput } from "@/services/s3.service";
import { AuthService } from "@/modules/auth/auth.service";
import { AdminAccountService } from "@/modules/admin-account/admin-account.service";
import { BadRequestException } from "@/utils/app-error.utils";

type AdminLoginPayload = {
  email: string;
  password: string;
};

type AdminProfileUpdatePayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  contactNo?: string;
};

export class AdminAuthService {
  private authService: AuthService;
  private adminAccountService: AdminAccountService;

  constructor() {
    this.authService = new AuthService();
    this.adminAccountService = new AdminAccountService();
  }

  async login(payload: AdminLoginPayload) {
    return this.authService.adminLogin(payload);
  }

  async logout(adminId: string, refreshToken?: string | null) {
    if (!refreshToken) {
      throw new BadRequestException("Refresh token is required");
    }
    return this.authService.logout(refreshToken, adminId, "admin");
  }

  async logoutAll(adminId: string) {
    return this.authService.logoutAll(adminId, "admin");
  }

  async getProfile(adminId: string) {
    const admin = await this.adminAccountService.getById(adminId);
    if (!admin) {
      throw new BadRequestException("Admin account not found");
    }
    return this.adminAccountService.toProfileSummary(admin);
  }

  async updateProfile(
    adminId: string,
    payload: AdminProfileUpdatePayload,
    photo?: Express.Multer.File,
  ) {
    const normalizedPayload = {
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone ?? payload.contactNo,
      contactNo: payload.contactNo ?? payload.phone,
    };

    const hasPayload = Object.values(normalizedPayload).some(
      (value) => value !== undefined && value !== null,
    );

    if (!hasPayload && !photo) {
      throw new BadRequestException("No profile changes provided");
    }

    if (hasPayload) {
      await this.adminAccountService.updateProfile(adminId, normalizedPayload);
    }

    if (photo) {
      const uploadPayload: StorageUploadInput = {
        buffer: photo.buffer,
        mimeType: photo.mimetype,
        originalName: photo.originalname,
      };
      await this.adminAccountService.updateProfilePhoto(adminId, uploadPayload);
    }

    return this.getProfile(adminId);
  }

  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    return this.authService.changePassword(
      adminId,
      currentPassword,
      newPassword,
      "admin",
    );
  }
}
