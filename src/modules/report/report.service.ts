import { PAGINATION } from "@/constants/app.constants";
import { adminNotificationService } from "@/modules/admin-notification/admin-notification.service";
import { notificationService } from "@/modules/notification/notification.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { Activity } from "../activity/activity.model";
import { Event } from "../event/event.model";
import { Message } from "../message/message.model";
import { User } from "../user/user.model";
import { Report } from "./report.model";

type ReportEntityType = "user" | "activity" | "event" | "message";
type ReportStatus = "open" | "under_review" | "resolved" | "rejected";

export class ReportService {
  async create(
    reporterId: string,
    payload: {
      entityType: ReportEntityType;
      entityId: string;
      reason: string;
      details?: string;
    },
  ) {
    const { reportedUserId } = await this.resolveReportTarget(
      payload.entityType,
      payload.entityId,
    );

    if (reportedUserId && reportedUserId === reporterId) {
      throw new BadRequestException("You cannot report your own content");
    }

    const existingOpenReport = await Report.findOne({
      reporterId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      status: { $in: ["open", "under_review"] },
    }).exec();

    if (existingOpenReport) {
      throw new BadRequestException(
        "You already reported this item and it is under review",
      );
    }

    const report = await Report.create({
      reporterId,
      reportedUserId,
      ...payload,
    });

    await adminNotificationService.create({
      type: "report_submitted",
      title: "New report submitted",
      body: `A new ${payload.entityType} report has been submitted.`,
      payload: {
        reportId: report._id.toString(),
        entityType: report.entityType,
        entityId: report.entityId.toString(),
        reporterId,
        reportedUserId,
      },
    });

    return this.getByIdHydrated(report._id.toString());
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

    return this.getByIdHydrated(report._id.toString());
  }

  private async listCommon(filterInput: Record<string, unknown>) {
    const page = Number(filterInput.page ?? PAGINATION.DEFAULT_PAGE);
    const limit = Number(filterInput.limit ?? PAGINATION.DEFAULT_LIMIT);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (filterInput.reporterId) filter.reporterId = filterInput.reporterId;
    if (filterInput.status) filter.status = filterInput.status;
    if (filterInput.entityType) filter.entityType = filterInput.entityType;

    const [data, totalItems] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reporterId", "fullName profileImageUrl email")
        .populate("reportedUserId", "fullName profileImageUrl email")
        .exec(),
      Report.countDocuments(filter),
    ]);

    return {
      data: data.map((report) => this.serializeReport(report as any)),
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

  private async getByIdHydrated(reportId: string) {
    const report = await Report.findById(reportId)
      .populate("reporterId", "fullName profileImageUrl email")
      .populate("reportedUserId", "fullName profileImageUrl email")
      .exec();

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    return this.serializeReport(report as any);
  }

  private async resolveReportTarget(entityType: ReportEntityType, entityId: string) {
    if (entityType === "activity") {
      const activity = await Activity.findById(entityId)
        .select("_id hostId")
        .exec();
      if (!activity) {
        throw new NotFoundException("Activity not found");
      }

      return {
        reportedUserId: activity.hostId.toString(),
      };
    }

    if (entityType === "event") {
      const event = await Event.findById(entityId)
        .select("_id creatorId")
        .exec();
      if (!event) {
        throw new NotFoundException("Event not found");
      }

      return {
        reportedUserId: event.creatorId.toString(),
      };
    }

    if (entityType === "user") {
      const user = await User.findById(entityId).select("_id").exec();
      if (!user) {
        throw new NotFoundException("User not found");
      }

      return {
        reportedUserId: user._id.toString(),
      };
    }

    const message = await Message.findById(entityId).select("_id senderId").exec();
    if (!message) {
      throw new NotFoundException("Message not found");
    }

    return {
      reportedUserId: message.senderId.toString(),
    };
  }

  private normalizeUser(userRef: unknown): {
    id: string | null;
    fullName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  } | null {
    if (!userRef) return null;

    if (typeof userRef === "string") {
      return {
        id: userRef,
        fullName: null,
        email: null,
        profileImageUrl: null,
      };
    }

    if (typeof userRef === "object") {
      const user = userRef as {
        _id?: { toString: () => string } | string;
        fullName?: unknown;
        email?: unknown;
        profileImageUrl?: unknown;
      };

      const idValue = user._id
        ? typeof user._id === "string"
          ? user._id
          : user._id.toString()
        : null;

      return {
        id: idValue,
        fullName: typeof user.fullName === "string" ? user.fullName : null,
        email: typeof user.email === "string" ? user.email : null,
        profileImageUrl:
          typeof user.profileImageUrl === "string" ? user.profileImageUrl : null,
      };
    }

    return null;
  }

  private serializeReport(reportDoc: {
    toObject: () => Record<string, any>;
    _id: { toString: () => string };
    reporterId: unknown;
    reportedUserId?: unknown;
    entityType: ReportEntityType;
    entityId: { toString: () => string } | string;
    reason: string;
    status: ReportStatus;
    createdAt: Date;
  }) {
    const base = reportDoc.toObject();
    const reportFrom = this.normalizeUser(reportDoc.reporterId);
    const reportTo = this.normalizeUser(reportDoc.reportedUserId || null);

    return {
      ...base,
      id: reportDoc._id.toString(),
      reporterId: reportFrom?.id || null,
      reportedUserId: reportTo?.id || null,
      entityId:
        typeof reportDoc.entityId === "string"
          ? reportDoc.entityId
          : reportDoc.entityId.toString(),
      reportFrom,
      reportTo,
      reportReason: reportDoc.reason,
      dateTime: reportDoc.createdAt,
      adminTable: {
        reportFrom,
        reportTo,
        reportReason: reportDoc.reason,
        dateTime: reportDoc.createdAt,
        status: reportDoc.status,
        entityType: reportDoc.entityType,
      },
    };
  }
}
