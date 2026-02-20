import { ROLES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import { Router, type Request, type Response } from "express";
import {
  adminReportActionSchema,
  adminDismissReportSchema,
  adminResolveReportSchema,
  listReportSchema,
  createReportSchema,
  updateReportStatusSchema,
} from "./report.schema";
import { ReportService } from "./report.service";

const service = new ReportService();

export const reportRouter = Router();
export const adminReportRouter = Router();

reportRouter.post(
  "/",
  authMiddleware.verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createReportSchema, req);
    const userId = req.user?.userId as string;
    const report = await service.create(userId, validated.body);
    ApiResponse.created(res, report, "Report submitted successfully");
  }),
);

const listMineHandler = asyncHandler(async (req: Request, res: Response) => {
  const validated = await zParse(listReportSchema, req);
  const userId = req.user?.userId as string;
  const result = await service.listMine(userId, validated.query);
  ApiResponse.paginated(res, result.data, result.pagination, "Reports fetched");
});

reportRouter.get("/mine", authMiddleware.verifyToken, listMineHandler);
reportRouter.get("/me", authMiddleware.verifyToken, listMineHandler);

reportRouter.get(
  "/admin",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listReportSchema, req);
    const result = await service.listAll(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Reports fetched successfully",
    );
  }),
);

reportRouter.patch(
  "/admin/:id/status",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateReportStatusSchema, req);
    const adminId = req.user?.userId as string;
    const report = await service.updateStatus(
      validated.params.id,
      adminId,
      validated.body,
    );
    ApiResponse.success(res, report, "Report status updated successfully");
  }),
);

adminReportRouter.get(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listReportSchema, req);
    const result = await service.listAll(validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Reports fetched successfully",
    );
  }),
);

adminReportRouter.post(
  "/:id/resolve",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(adminResolveReportSchema, req);
    const adminId = req.user?.userId as string;
    const requestedStatus = validated.body.status;
    const status =
      requestedStatus === "under_review"
        ? "under_review"
        : requestedStatus === "closed"
          ? "resolved"
          : "resolved";

    const report = await service.updateStatus(validated.params.id, adminId, {
      status,
      adminNote: validated.body.adminNote ?? validated.body.resolutionNotes,
    });

    ApiResponse.success(res, report, "Report resolved successfully");
  }),
);

adminReportRouter.post(
  "/:id/dismiss",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(adminDismissReportSchema, req);
    const adminId = req.user?.userId as string;
    const report = await service.updateStatus(validated.params.id, adminId, {
      status: "rejected",
      adminNote: validated.body.adminNote ?? validated.body.dismissalReason,
    });

    ApiResponse.success(res, report, "Report dismissed successfully");
  }),
);

adminReportRouter.patch(
  "/:id/status",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateReportStatusSchema, req);
    const adminId = req.user?.userId as string;
    const report = await service.updateStatus(
      validated.params.id,
      adminId,
      validated.body,
    );
    ApiResponse.success(res, report, "Report status updated successfully");
  }),
);

adminReportRouter.post(
  "/:id/action",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(adminReportActionSchema, req);
    const adminId = req.user?.userId as string;
    const report = await service.applyAdminAction(validated.params.id, adminId, {
      action: validated.body.action,
      note: validated.body.note,
    });
    ApiResponse.success(res, report, "Report action applied successfully");
  }),
);
