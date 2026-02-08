// file: src/config/bootstrap.ts

import { logger } from "@/middlewares/pino-logger";
import { AdminSeeder } from "@/seeders/admin.seeder";
import { reminderService } from "@/services/reminder.service";

export async function bootstrapApplication(): Promise<void> {
  try {
    logger.info("🚀 Bootstrapping application...");
    await AdminSeeder.run();
    reminderService.start();

    logger.info("✅ Application bootstrapped successfully");
  } catch (error) {
    logger.error(error, "❌ Bootstrap failed");
    throw error;
  }
}
