import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  listNotificationsSchema,
  notificationIdSchema,
} from "./notification.schema";
import { NotificationService } from "./notification.service";

export class NotificationController {
  private service: NotificationService;

  constructor() {
    this.service = new NotificationService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listNotificationsSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.list(userId, validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Notifications fetched successfully",
    );
  });

  unreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const result = await this.service.unreadCount(userId);
    ApiResponse.success(res, result, "Unread count fetched successfully");
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(notificationIdSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.markRead(userId, validated.params.id);
    ApiResponse.success(res, result, "Notification marked as read");
  });

  markReadAll = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const result = await this.service.markReadAll(userId);
    ApiResponse.success(res, result, "All notifications marked as read");
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(notificationIdSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.remove(userId, validated.params.id);
    ApiResponse.success(res, result, "Notification deleted successfully");
  });
}
