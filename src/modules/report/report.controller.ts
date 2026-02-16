import { ROLES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import { Router, type Request, type Response } from "express";
import {
  createReportSchema,
  listReportSchema,
  updateReportStatusSchema,
} from "./report.schema";
import { ReportService } from "./report.service";

const service = new ReportService();

export const reportRouter = Router();

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
