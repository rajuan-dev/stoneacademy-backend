// file: src/modules/activity/activity.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  activityIdSchema,
  createActivitySchema,
  listActivitiesSchema,
  messageHostSchema,
  updateActivitySchema,
} from "./activity.schema";
import { ActivityService } from "./activity.service";

export class ActivityController {
  private service: ActivityService;

  constructor() {
    this.service = new ActivityService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listActivitiesSchema, req);
    const result = await this.service.list(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Activities fetched successfully",
    );
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const locationLatitude = (req.body as any)?.["location[latitude]"];
    const locationLongitude = (req.body as any)?.["location[longitude]"];
    const locationLabel = (req.body as any)?.["location[label]"];

    if (
      req.body
      && !req.body.location
      && locationLatitude !== undefined
      && locationLongitude !== undefined
    ) {
      req.body.location = {
        latitude: locationLatitude,
        longitude: locationLongitude,
        ...(locationLabel !== undefined ? { label: locationLabel } : {}),
      };
    }

    const validated = await zParse(createActivitySchema, req);
    const userId = req.user?.userId as string;
    const mediaFiles = ((req.files as Express.Multer.File[]) || []).filter(Boolean);
    const activity = await this.service.create({
      hostId: userId,
      mediaFiles,
      ...validated.body,
    });
    ApiResponse.created(res, activity, "Activity created successfully");
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activityIdSchema, req);
    const userId = req.user?.userId as string | undefined;
    const activity = await this.service.getByIdForUser(validated.params.id, userId);
    ApiResponse.success(res, activity, "Activity fetched successfully");
  });

  getJoinStatus = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activityIdSchema, req);
    const userId = req.user?.userId as string;
    const status = await this.service.getJoinStatus(validated.params.id, userId);
    ApiResponse.success(res, status, "Activity join status fetched successfully");
  });

  getJoinedUsers = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activityIdSchema, req);
    const result = await this.service.getJoinedUsers(validated.params.id);
    ApiResponse.success(res, result, "Activity joined users fetched successfully");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateActivitySchema, req);
    const userId = req.user?.userId as string;
    const activity = await this.service.update(
      validated.params.id,
      userId,
      validated.body,
    );
    ApiResponse.success(res, activity, "Activity updated successfully");
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activityIdSchema, req);
    const userId = req.user?.userId as string;
    const activity = await this.service.remove(validated.params.id, userId);
    ApiResponse.success(res, activity, "Activity cancelled successfully");
  });

  join = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activityIdSchema, req);
    const userId = req.user?.userId as string;
    const participant = await this.service.join(validated.params.id, userId);
    ApiResponse.success(res, participant, "Joined activity successfully");
  });

  leave = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activityIdSchema, req);
    const userId = req.user?.userId as string;
    const participant = await this.service.leave(validated.params.id, userId);
    ApiResponse.success(res, participant, "Left activity successfully");
  });

  pass = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activityIdSchema, req);
    const userId = req.user?.userId as string;
    const pass = await this.service.pass(validated.params.id, userId);
    ApiResponse.success(res, pass, "Pass fetched successfully");
  });

  cancel = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activityIdSchema, req);
    const userId = req.user?.userId as string;
    const activity = await this.service.cancel(validated.params.id, userId);
    ApiResponse.success(res, activity, "Activity cancelled successfully");
  });

  messageHost = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(messageHostSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.messageHost(
      validated.params.id,
      userId,
      validated.body,
    );
    ApiResponse.success(
      res,
      result,
      "Host conversation ready",
    );
  });
}
