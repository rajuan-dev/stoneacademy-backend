import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { BadRequestException } from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import type { StorageUploadInput } from "@/services/s3.service";
import {
  listUsersSchema,
  listActivitiesSchema,
  listEventsSchema,
  listPremiumCreatorsSchema,
  listSubscriptionsSchema,
  updateAdminProfileSchema,
  updateSubscriptionFeesSchema,
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

  getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.userId as string;
    const profile = await this.service.getAdminProfile(adminId);
    ApiResponse.success(res, profile, "Admin profile fetched successfully");
  });

  updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.userId as string;
    const rawBody = (req.body || {}) as Record<string, unknown>;
    const normalizedBody: Record<string, unknown> = {};

    Object.entries(rawBody).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        normalizedBody[key] = value[0];
        return;
      }
      normalizedBody[key] = value;
    });

    const bodyPayload: Record<string, unknown> = {};
    ["fullName", "email", "phone", "contactNo", "phoneNumber"].forEach((key) => {
      if (normalizedBody[key] !== undefined) {
        bodyPayload[key] = normalizedBody[key];
      }
    });

    const file = req.file;
    const hasBodyValues = Object.keys(bodyPayload).some((key) => {
      const value = bodyPayload[key];
      return value !== undefined && value !== null && String(value).trim() !== "";
    });

    if (!hasBodyValues && !file) {
      throw new BadRequestException(
        "At least one profile field or photo is required",
      );
    }

    const validatedBody = hasBodyValues
      ? (await updateAdminProfileSchema.parseAsync({ body: bodyPayload })).body
      : {};

    let photoUpload: StorageUploadInput | undefined;
    if (file) {
      photoUpload = {
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
      };
    }

    const profile = await this.service.updateAdminProfile(
      adminId,
      validatedBody,
      photoUpload,
    );

    ApiResponse.success(res, profile, "Admin profile updated successfully");
  });

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
      validated.body.reason,
      req.user?.userId as string,
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

  dashboardAnalytics = asyncHandler(async (_req: Request, res: Response) => {
    const result = await this.service.dashboardAnalytics();
    ApiResponse.success(res, result, "Dashboard analytics fetched successfully");
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
      req.user?.userId as string,
    );
    ApiResponse.success(res, activity, "Activity status updated");
  });

  updateEventStatus = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateEventStatusSchema, req);
    const event = await this.service.updateEventStatus(
      validated.params.id,
      validated.body.status,
      req.user?.userId as string,
    );
    ApiResponse.success(res, event, "Event status updated");
  });

  listSubscriptions = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listSubscriptionsSchema, req);
    const result = await this.service.listSubscriptions(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Subscriptions fetched",
    );
  });

  getSubscriptionFees = asyncHandler(async (_req: Request, res: Response) => {
    const fees = await this.service.getSubscriptionFees();
    ApiResponse.success(res, fees, "Subscription fees fetched");
  });

  updateSubscriptionFees = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateSubscriptionFeesSchema, req);
    const adminId = req.user?.userId as string;
    const fees = await this.service.updateSubscriptionFees(validated.body, adminId);
    ApiResponse.success(res, fees, "Subscription fees updated");
  });

  listPremiumEventCreators = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listPremiumCreatorsSchema, req);
    const result = await this.service.listPremiumEventCreators(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Premium event creators fetched",
    );
  });

  getPremiumEventCreatorDetails = asyncHandler(async (req: Request, res: Response) => {
    const creatorId = req.params.id;
    const result = await this.service.getPremiumEventCreatorDetails(creatorId);
    ApiResponse.success(res, result, "Premium event creator details fetched");
  });
}
