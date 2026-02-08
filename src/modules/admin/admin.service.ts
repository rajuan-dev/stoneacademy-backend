import { ACTIVITY_STATUS, PAGINATION } from "@/constants/app.constants";
import { NotFoundException } from "@/utils/app-error.utils";
import { User } from "../user/user.model";
import { Activity } from "../activity/activity.model";
import { Event } from "../event/event.model";
import { Report } from "../report/report.model";
import { SupportTicket } from "../support/support-ticket.model";
import { PaymentTransaction } from "../event/payment-transaction.model";
import { AdminAuditLog } from "./admin-audit-log.model";
import { Subscription } from "../subscription/subscription.model";

export class AdminService {
  async listUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isDeleted: false };
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.search) {
      const pattern = new RegExp(query.search, "i");
      filter.$or = [{ fullName: pattern }, { email: pattern }];
    }

    const [data, totalItems] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      User.countDocuments(filter),
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

  async updateUserStatus(userId: string, status: string, reason?: string, adminId?: string) {
    const update: Record<string, any> = { status };
    if (reason !== undefined) {
      update.blockedReason = reason;
      update.blockedAt = status === "suspended" ? new Date() : null;
      update.blockedBy = status === "suspended" && adminId ? adminId : null;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true },
    ).select("-passwordHash").exec();
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateUserRole(userId: string, role: string) {
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true },
    ).select("-passwordHash").exec();
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async dashboardOverview() {
    const [
      totalUsers,
      totalActivities,
      totalEvents,
      openReports,
      openSupportTickets,
      paymentSummary,
    ] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      Activity.countDocuments({}),
      Event.countDocuments({}),
      Report.countDocuments({ status: { $in: ["open", "under_review"] } }),
      SupportTicket.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      PaymentTransaction.aggregate([
        { $match: { status: "succeeded" } },
        {
          $group: {
            _id: null,
            gross: { $sum: "$grossAmount" },
            platformFee: { $sum: "$platformFeeAmount" },
            creatorShare: { $sum: "$creatorShareAmount" },
          },
        },
      ]),
    ]);

    return {
      totalUsers,
      totalActivities,
      totalEvents,
      openReports,
      openSupportTickets,
      payments: paymentSummary[0] || {
        gross: 0,
        platformFee: 0,
        creatorShare: 0,
      },
    };
  }

  async dashboardAnalytics() {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);

    const [userSeries, activitySeries, eventSeries, revenueSeries] =
      await Promise.all([
        User.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        Activity.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        Event.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        PaymentTransaction.aggregate([
          { $match: { status: "succeeded", createdAt: { $gte: since } } },
          {
            $group: {
              _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
              gross: { $sum: "$grossAmount" },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
      ]);

    return {
      users: userSeries,
      activities: activitySeries,
      events: eventSeries,
      revenue: revenueSeries,
    };
  }

  async listActivities(query: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.q) {
      const pattern = new RegExp(query.q, "i");
      filter.$or = [{ title: pattern }, { description: pattern }];
    }
    if (query.status) {
      filter.status = query.status;
    }

    const [data, totalItems] = await Promise.all([
      Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Activity.countDocuments(filter),
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

  async listEvents(query: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.q) {
      const pattern = new RegExp(query.q, "i");
      filter.$or = [{ title: pattern }, { description: pattern }];
    }
    if (query.status) {
      filter.status = query.status;
    }

    const [data, totalItems] = await Promise.all([
      Event.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Event.countDocuments(filter),
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

  async updateActivityStatus(activityId: string, status: string, adminId?: string) {
    if (!Object.values(ACTIVITY_STATUS).includes(status as any)) {
      throw new NotFoundException("Invalid status");
    }
    const activity = await Activity.findByIdAndUpdate(
      activityId,
      { status },
      { new: true },
    ).exec();
    if (!activity) {
      throw new NotFoundException("Activity not found");
    }
    if (adminId) {
      await AdminAuditLog.create({
        adminId,
        action: "activity_status_updated",
        entityType: "activity",
        entityId: activity._id,
        meta: { status },
      });
    }
    return activity;
  }

  async updateEventStatus(eventId: string, status: string, adminId?: string) {
    if (!Object.values(ACTIVITY_STATUS).includes(status as any)) {
      throw new NotFoundException("Invalid status");
    }
    const event = await Event.findByIdAndUpdate(
      eventId,
      { status },
      { new: true },
    ).exec();
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    if (adminId) {
      await AdminAuditLog.create({
        adminId,
        action: "event_status_updated",
        entityType: "event",
        entityId: event._id,
        meta: { status },
      });
    }
    return event;
  }

  async listSubscriptions(query: {
    page?: number;
    limit?: number;
    status?: string;
    plan?: string;
    search?: string;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.status) filter.status = query.status;
    if (query.plan) filter.plan = query.plan;

    let userFilter: Record<string, any> | undefined;
    if (query.search) {
      const pattern = new RegExp(query.search, "i");
      userFilter = { $or: [{ fullName: pattern }, { email: pattern }] };
    }

    const [data, totalItems] = await Promise.all([
      Subscription.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "userId",
          select: "fullName email",
          match: userFilter,
        })
        .exec(),
      Subscription.countDocuments(filter),
    ]);

    const filteredData = userFilter
      ? data.filter((item) => item.userId)
      : data;

    return {
      data: filteredData,
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
