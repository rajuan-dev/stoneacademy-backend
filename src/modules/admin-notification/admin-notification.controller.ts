import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  adminNotificationIdSchema,
  listAdminNotificationsSchema,
} from "./admin-notification.schema";
import { AdminNotificationService } from "./admin-notification.service";

export class AdminNotificationController {
  private service: AdminNotificationService;

  constructor() {
    this.service = new AdminNotificationService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listAdminNotificationsSchema, req);
    const adminId = req.user?.userId as string;
    const result = await this.service.list(adminId, validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Notifications fetched");
  });

  unreadCount = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.userId as string;
    const result = await this.service.unreadCount(adminId);
    ApiResponse.success(res, result, "Unread count fetched");
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(adminNotificationIdSchema, req);
    const adminId = req.user?.userId as string;
    const result = await this.service.markRead(adminId, validated.params.id);
    ApiResponse.success(res, result, "Notification marked as read");
  });

  markReadAll = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.userId as string;
    const result = await this.service.markReadAll(adminId);
    ApiResponse.success(res, result, "All notifications marked as read");
  });
}
