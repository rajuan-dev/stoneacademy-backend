import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  listUsersSchema,
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
}
