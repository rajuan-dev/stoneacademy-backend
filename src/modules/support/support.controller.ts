import { ROLES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import { Router, type Request, type Response } from "express";
import {
  addReplySchema,
  createTicketSchema,
  listTicketSchema,
  ticketIdSchema,
  updateTicketStatusSchema,
} from "./support.schema";
import { SupportService } from "./support.service";

const service = new SupportService();
export const supportRouter = Router();

supportRouter.post(
  "/tickets",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createTicketSchema, req);
    const userId = req.user?.userId as string;
    const ticket = await service.createTicket(userId, validated.body);
    ApiResponse.created(res, ticket, "Support ticket created successfully");
  }),
);

supportRouter.get(
  "/tickets/mine",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listTicketSchema, req);
    const userId = req.user?.userId as string;
    const result = await service.listMine(userId, validated.query);
    ApiResponse.paginated(res, result.data, result.pagination, "Tickets fetched");
  }),
);

supportRouter.get(
  "/tickets/:id",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(ticketIdSchema, req);
    const userId = req.user?.userId as string;
    const ticket = await service.getOneForUser(userId, validated.params.id);
    ApiResponse.success(res, ticket, "Ticket fetched successfully");
  }),
);

supportRouter.post(
  "/tickets/:id/reply",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(addReplySchema, req);
    const userId = req.user?.userId as string;
    const ticket = await service.addReplyAsUser(
      userId,
      validated.params.id,
      validated.body.message,
    );
    ApiResponse.success(res, ticket, "Reply added successfully");
  }),
);

supportRouter.get(
  "/admin/tickets",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listTicketSchema, req);
    const result = await service.listAdmin(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Tickets fetched successfully",
    );
  }),
);

supportRouter.post(
  "/admin/tickets/:id/reply",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(addReplySchema, req);
    const adminId = req.user?.userId as string;
    const ticket = await service.addReplyAsAdmin(
      adminId,
      validated.params.id,
      validated.body.message,
    );
    ApiResponse.success(res, ticket, "Reply added successfully");
  }),
);

supportRouter.patch(
  "/admin/tickets/:id/status",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateTicketStatusSchema, req);
    const ticket = await service.updateStatus(
      validated.params.id,
      validated.body.status,
    );
    ApiResponse.success(res, ticket, "Ticket status updated successfully");
  }),
);
