import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  createEventSchema,
  eventIdSchema,
  joinEventSchema,
  listEventsSchema,
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
    const validated = await zParse(createEventSchema, req);
    const userId = req.user?.userId as string;
    const event = await this.service.create({
      creatorId: userId,
      ...validated.body,
    });
    ApiResponse.created(res, event, "Event created successfully");
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(eventIdSchema, req);
    const event = await this.service.getById(validated.params.id);
    ApiResponse.success(res, event, "Event fetched successfully");
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
}
