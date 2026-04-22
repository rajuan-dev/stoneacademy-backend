import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { BadRequestException } from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import type { StorageUploadInput } from "@/services/s3.service";
import {
  blockUserSchema,
  creatorIdSchema,
  earningTransactionIdSchema,
  listEarningTransactionsSchema,
  processEventCreatorPayoutSchema,
  listUsersSchema,
  listBlockedUsersSchema,
  listActivitiesSchema,
  listEventsSchema,
  listPremiumCreatorsSchema,
  dashboardAnalyticsSchema,
  listSubscriptionsSchema,
  searchUsersSchema,
  unblockUserSchema,
  updateAdminProfileSchema,
  updateSubscriptionFeesSchema,
  updateActivityStatusSchema,
  updateEventStatusSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdSchema,
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

  listBlockedUsers = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listBlockedUsersSchema, req);
    const result = await this.service.listBlockedUsers(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Blocked users fetched",
    );
  });

  searchUsers = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(searchUsersSchema, req);
    const result = await this.service.searchUsers(validated.query);
    ApiResponse.success(res, result, "User search results");
  });

  getUserDetails = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(userIdSchema, req);
    const user = await this.service.getUserDetails(validated.params.id);
    ApiResponse.success(res, user, "User details fetched");
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

  blockUser = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(blockUserSchema, req);
    const adminId = req.user?.userId as string;
    const user = await this.service.blockUser(
      validated.params.id,
      adminId,
      validated.body.reason,
    );
    ApiResponse.success(res, user, "User blocked successfully");
  });

  unblockUser = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(unblockUserSchema, req);
    const adminId = req.user?.userId as string;
    const user = await this.service.unblockUser(
      validated.params.id,
      adminId,
    );
    ApiResponse.success(res, user, "User unblocked successfully");
  });

  dashboardOverview = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.dashboardOverview();
    ApiResponse.success(res, result, "Dashboard overview fetched successfully");
  });

  dashboardAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(dashboardAnalyticsSchema, req);
    const result = await this.service.dashboardAnalytics(validated.query);
    ApiResponse.success(res, result, "Dashboard analytics fetched successfully");
  });

  dashboardBootstrap = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(dashboardAnalyticsSchema, req);
    const result = await this.service.dashboardBootstrap(validated.query);
    ApiResponse.success(res, result, "Dashboard bootstrap fetched successfully");
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

  listEventCreators = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listPremiumCreatorsSchema, req);
    const result = await this.service.listEventCreators(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Event creators fetched",
    );
  });

  getEventCreatorDetails = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(creatorIdSchema, req);
    const result = await this.service.getPremiumEventCreatorDetails(validated.params.id);
    ApiResponse.success(res, result, "Event creator details fetched");
  });

  processEventCreatorPayout = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(processEventCreatorPayoutSchema, req);
    const adminId = req.user?.userId as string;
    const result = await this.service.processEventCreatorPayout(
      validated.params.id,
      adminId,
      validated.body,
    );
    ApiResponse.success(res, result, "Event creator payout processed");
  });

  listEarningTransactions = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listEarningTransactionsSchema, req);
    const result = await this.service.listEarningTransactions(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Earning transactions fetched",
    );
  });

  getEarningTransactionDetails = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(earningTransactionIdSchema, req);
    const result = await this.service.getEarningTransactionDetails(validated.params.id);
    ApiResponse.success(res, result, "Earning transaction fetched");
  });

  generateEarningInvoice = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(earningTransactionIdSchema, req);
    const result = await this.service.generateEarningInvoice(validated.params.id);
    ApiResponse.success(res, result, "Invoice generated");
  });
}
