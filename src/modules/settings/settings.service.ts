import { env } from "@/env";
import { AuthService } from "@/modules/auth/auth.service";
import { AdminAccountService } from "@/modules/admin-account/admin-account.service";
import { NotFoundException } from "@/utils/app-error.utils";
import { Settings } from "./settings.model";

const PLATFORM_SETTINGS_KEY = "platform";

export type PlatformSettings = {
  platformFeePercent: number;
  cancellationPolicy: string;
  refundPolicy: string;
  reminderMinutes: number;
  subscriptionMonthlyPrice: number;
  subscriptionYearlyPrice: number;
};

const DEFAULT_SETTINGS: PlatformSettings = {
  platformFeePercent: 10,
  cancellationPolicy: "Standard cancellation policy.",
  refundPolicy: "Refunds are handled according to the event policy.",
  reminderMinutes: env.REMINDER_MINUTES ?? 30,
  subscriptionMonthlyPrice: 9.99,
  subscriptionYearlyPrice: 99.99,
};

export class SettingsService {
  private authService: AuthService;
  private adminAccountService: AdminAccountService;

  constructor() {
    this.authService = new AuthService();
    this.adminAccountService = new AdminAccountService();
  }

  async getPlatformSettings(): Promise<PlatformSettings> {
    const doc = await Settings.findOne({ key: PLATFORM_SETTINGS_KEY }).exec();
    if (!doc) {
      const created = await Settings.create({
        key: PLATFORM_SETTINGS_KEY,
        value: DEFAULT_SETTINGS,
      });
      return created.value as PlatformSettings;
    }
    return { ...DEFAULT_SETTINGS, ...(doc.value || {}) } as PlatformSettings;
  }

  async updatePlatformSettings(
    payload: Partial<PlatformSettings>,
    adminId: string,
  ): Promise<PlatformSettings> {
    const current = await this.getPlatformSettings();
    const updatedValue = { ...current, ...payload };
    const doc = await Settings.findOneAndUpdate(
      { key: PLATFORM_SETTINGS_KEY },
      { value: updatedValue, updatedBy: adminId },
      { new: true, upsert: true },
    ).exec();
    return (doc?.value || updatedValue) as PlatformSettings;
  }

  async getAdminSettingsProfile(adminId: string) {
    const admin = await this.adminAccountService.getById(adminId);
    if (!admin) {
      throw new NotFoundException("Admin account not found");
    }
    return this.adminAccountService.toProfileSummary(admin);
  }

  async updateAdminSettingsProfile(
    adminId: string,
    payload: {
      fullName?: string;
      email?: string;
      phone?: string;
      contactNo?: string;
      phoneNumber?: string;
    },
  ) {
    const updated = await this.adminAccountService.updateProfile(adminId, payload);
    return this.adminAccountService.toProfileSummary(updated);
  }

  async getAdminSettingsSecurity() {
    return {
      passwordPolicy: {
        minLength: 8,
        requiresUppercase: true,
        requiresLowercase: true,
        requiresNumber: true,
        requiresSpecialCharacter: true,
      },
      canChangePassword: true,
    };
  }

  async updateAdminSettingsSecurity(
    adminId: string,
    payload: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      adminId,
      payload.currentPassword,
      payload.newPassword,
      "admin",
    );
  }
}
