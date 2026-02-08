import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  listUsersSchema,
  listActivitiesSchema,
  listEventsSchema,
  updateActivityStatusSchema,
  updateEventStatusSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "./admin.schema";
import { AdminService } from "./admin.service";

export class AdminController {
  private service: AdminService;

  constructor() {
    this.service = new AdminService();
  }

  listUsers = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listUsersSchema, req);
    const result = await this.service.listUsers(validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Users fetched");
  });

  updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateUserStatusSchema, req);
    const user = await this.service.updateUserStatus(
      validated.params.id,
      validated.body.status,
    );
    ApiResponse.success(res, user, "User status updated successfully");
  });

  updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateUserRoleSchema, req);
    const user = await this.service.updateUserRole(
      validated.params.id,
      validated.body.role,
    );
    ApiResponse.success(res, user, "User role updated successfully");
  });

  dashboardOverview = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.dashboardOverview();
    ApiResponse.success(res, result, "Dashboard overview fetched successfully");
  });

  listActivities = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listActivitiesSchema, req);
    const result = await this.service.listActivities(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Activities fetched",
    );
  });

  listEvents = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listEventsSchema, req);
    const result = await this.service.listEvents(validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Events fetched");
  });

  updateActivityStatus = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateActivityStatusSchema, req);
    const activity = await this.service.updateActivityStatus(
      validated.params.id,
      validated.body.status,
    );
    ApiResponse.success(res, activity, "Activity status updated");
  });

  updateEventStatus = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateEventStatusSchema, req);
    const event = await this.service.updateEventStatus(
      validated.params.id,
      validated.body.status,
    );
    ApiResponse.success(res, event, "Event status updated");
  });
}
