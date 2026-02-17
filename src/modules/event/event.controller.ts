import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  createEventSchema,
  eventIdSchema,
  joinEventSchema,
  listEventsSchema,
  messageEventHostSchema,
  updateEventSchema,
} from "./event.schema";
import { EventService } from "./event.service";

export class EventController {
  private service: EventService;

  constructor() {
    this.service = new EventService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listEventsSchema, req);
    const result = await this.service.list(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Events fetched successfully",
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

    const validated = await zParse(createEventSchema, req);
    const userId = req.user?.userId as string;
    const rawFiles = req.files as
      | Express.Multer.File[]
      | Record<string, Express.Multer.File[]>
      | undefined;

    const mediaFiles = Array.isArray(rawFiles)
      ? rawFiles.filter(Boolean)
      : [
          ...(rawFiles?.media || []),
          ...(rawFiles?.mediaFiles || []),
          ...(rawFiles?.["mediaFiles[]"] || []),
        ].filter(Boolean);

    const event = await this.service.create({
      creatorId: userId,
      mediaFiles,
      ...validated.body,
    });
    ApiResponse.created(res, event, "Event created successfully");
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(eventIdSchema, req);
    const userId = req.user?.userId as string | undefined;
    const event = await this.service.getByIdForUser(validated.params.id, userId);
    ApiResponse.success(res, event, "Event fetched successfully");
  });

  getFee = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(eventIdSchema, req);
    const fee = await this.service.getFee(validated.params.id);
    ApiResponse.success(res, fee, "Event fee fetched successfully");
  });

  getJoinStatus = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(eventIdSchema, req);
    const userId = req.user?.userId as string;
    const status = await this.service.getJoinStatus(validated.params.id, userId);
    ApiResponse.success(res, status, "Event join status fetched successfully");
  });

  getJoinedUsers = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(eventIdSchema, req);
    const result = await this.service.getJoinedUsers(validated.params.id);
    ApiResponse.success(res, result, "Event joined users fetched successfully");
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateEventSchema, req);
    const userId = req.user?.userId as string;
    const event = await this.service.update(
      validated.params.id,
      userId,
      validated.body,
    );
    ApiResponse.success(res, event, "Event updated successfully");
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(eventIdSchema, req);
    const userId = req.user?.userId as string;
    const event = await this.service.remove(validated.params.id, userId);
    ApiResponse.success(res, event, "Event cancelled successfully");
  });

  join = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(joinEventSchema, req);
    const userId = req.user?.userId as string;
    const participant = await this.service.join(
      validated.params.id,
      userId,
      validated.body,
    );
    ApiResponse.success(res, participant, "Joined event successfully");
  });

  leave = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(eventIdSchema, req);
    const userId = req.user?.userId as string;
    const participant = await this.service.leave(validated.params.id, userId);
    ApiResponse.success(res, participant, "Left event successfully");
  });

  pass = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(eventIdSchema, req);
    const userId = req.user?.userId as string;
    const pass = await this.service.pass(validated.params.id, userId);
    ApiResponse.success(res, pass, "Event pass generated");
  });

  messageHost = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(messageEventHostSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.messageHost(
      validated.params.id,
      userId,
      validated.body,
    );
    ApiResponse.success(res, result, "Host conversation ready");
  });
}
