import { PAGINATION } from "@/constants/app.constants";
import { notificationService } from "@/modules/notification/notification.service";
import { adminNotificationService } from "@/modules/admin-notification/admin-notification.service";
import { NotFoundException } from "@/utils/app-error.utils";
import { Report } from "./report.model";

export class ReportService {
  async create(
    reporterId: string,
    payload: {
      entityType: "user" | "activity" | "event" | "message";
      entityId: string;
      reason: string;
      details?: string;
    },
  ) {
    const report = await Report.create({
      reporterId,
      ...payload,
    });

    await adminNotificationService.create({
      type: "report_submitted",
      title: "New report submitted",
      body: "A new report has been submitted.",
      payload: {
        reportId: report._id.toString(),
        entityType: report.entityType,
        entityId: report.entityId.toString(),
      },
    });

    return report;
  }

  async listMine(
    userId: string,
    query: { page?: number; limit?: number; status?: string; entityType?: string },
  ) {
    return this.listCommon({ ...query, reporterId: userId });
  }

  async listAll(
    query: { page?: number; limit?: number; status?: string; entityType?: string },
  ) {
    return this.listCommon(query);
  }

  async updateStatus(
    reportId: string,
    adminId: string,
    payload: { status: "under_review" | "resolved" | "rejected"; adminNote?: string },
  ) {
    const report = await Report.findById(reportId).exec();
    if (!report) throw new NotFoundException("Report not found");

    report.status = payload.status;
    report.adminNote = payload.adminNote;
    if (payload.status === "resolved" || payload.status === "rejected") {
      report.resolvedBy = adminId as any;
      report.resolvedAt = new Date();
    }
    await report.save();

    await notificationService.create({
      userId: report.reporterId.toString(),
      type: "report_status_updated",
      title: "Report status updated",
      body: `Your report is now ${payload.status}.`,
      payload: { reportId: report._id.toString(), status: payload.status },
    });

    return report;
  }

  private async listCommon(filterInput: Record<string, any>) {
    const page = filterInput.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = filterInput.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (filterInput.reporterId) filter.reporterId = filterInput.reporterId;
    if (filterInput.status) filter.status = filterInput.status;
    if (filterInput.entityType) filter.entityType = filterInput.entityType;

    const [data, totalItems] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Report.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }
}
