import { env } from "@/env";
import { Settings } from "./settings.model";

const PLATFORM_SETTINGS_KEY = "platform";

export type PlatformSettings = {
  platformFeePercent: number;
  cancellationPolicy: string;
  refundPolicy: string;
  reminderMinutes: number;
};

const DEFAULT_SETTINGS: PlatformSettings = {
  platformFeePercent: 10,
  cancellationPolicy: "Standard cancellation policy.",
  refundPolicy: "Refunds are handled according to the event policy.",
  reminderMinutes: env.REMINDER_MINUTES ?? 30,
};

export class SettingsService {
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
}
