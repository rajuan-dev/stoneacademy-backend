import { ACTIVITY_STATUS, PAGINATION } from "@/constants/app.constants";
import { NotFoundException } from "@/utils/app-error.utils";
import { Types } from "mongoose";
import { User } from "../user/user.model";
import { Activity } from "../activity/activity.model";
import { Event } from "../event/event.model";
import { Report } from "../report/report.model";
import { SupportTicket } from "../support/support-ticket.model";
import { PaymentTransaction } from "../event/payment-transaction.model";
import { AdminAuditLog } from "./admin-audit-log.model";
import { Subscription } from "../subscription/subscription.model";
import { SettingsService } from "../settings/settings.service";
import { PayoutRequest } from "../billing/payout-request.model";
import { UserService } from "../user/user.service";
import type { StorageUploadInput } from "@/services/s3.service";

export class AdminService {
  private settingsService: SettingsService;
  private userService: UserService;

  constructor() {
    this.settingsService = new SettingsService();
    this.userService = new UserService();
  }

  async getAdminProfile(adminId: string) {
    const profile = await this.userService.getProfile(adminId);
    return {
      profilePhoto: profile.profileImage || profile.profilePhoto || null,
      name: profile.fullName,
      email: profile.email,
      contactNo: profile.phone || profile.phoneNumber || null,
    };
  }

  async updateAdminProfile(
    adminId: string,
    payload: {
      fullName?: string;
      email?: string;
      phone?: string;
      contactNo?: string;
      phoneNumber?: string;
    },
    photo?: StorageUploadInput,
  ) {
    const normalizedPhone = payload.phone ?? payload.contactNo ?? payload.phoneNumber;

    let profile = await this.userService.getProfile(adminId);
    const updates: {
      fullName?: string;
      email?: string;
      phone?: string;
      phoneNumber?: string;
    } = {};

    if (payload.fullName !== undefined) updates.fullName = payload.fullName;
    if (payload.email !== undefined) updates.email = payload.email;
    if (normalizedPhone !== undefined) {
      updates.phone = normalizedPhone;
      updates.phoneNumber = normalizedPhone;
    }

    if (Object.keys(updates).length > 0) {
      profile = await this.userService.updateProfile(adminId, updates);
    }

    if (photo) {
      profile = await this.userService.updateProfilePhoto(adminId, photo);
    }

    return {
      profilePhoto: profile.profileImage || profile.profilePhoto || null,
      name: profile.fullName,
      email: profile.email,
      contactNo: profile.phone || profile.phoneNumber || null,
    };
  }

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
    const searchRegex = query.search ? new RegExp(query.search, "i") : null;

    const pipeline: Record<string, any>[] = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
    ];

    if (searchRegex) {
      pipeline.push({
        $match: {
          $or: [{ "user.fullName": searchRegex }, { "user.email": searchRegex }],
        },
      });
    }

    pipeline.push(
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          status: 1,
          plan: 1,
          startAt: 1,
          endAt: 1,
          createdAt: 1,
          user: {
            _id: "$user._id",
            fullName: "$user.fullName",
            email: "$user.email",
          },
        },
      },
    );

    const countPipeline: Record<string, any>[] = [
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
    ];

    if (searchRegex) {
      countPipeline.push({
        $match: {
          $or: [{ "user.fullName": searchRegex }, { "user.email": searchRegex }],
        },
      });
    }
    countPipeline.push({ $count: "count" });

    const [rows, countRows] = await Promise.all([
      Subscription.aggregate(pipeline as any[]),
      Subscription.aggregate(countPipeline as any[]),
    ]);

    const now = Date.now();
    const data = rows.map((row: any, idx: number) => ({
      status:
        row.status === "active" && new Date(row.endAt).getTime() <= now
          ? "expired"
          : row.status,
      sId: skip + idx + 1,
      id: row._id.toString(),
      userId: row.user?._id?.toString?.() || null,
      user: row.user?.fullName || null,
      email: row.user?.email || null,
      plans: row.plan,
      expirationDate: row.endAt,
      startAt: row.startAt,
      createdAt: row.createdAt,
    }));

    const totalItems = countRows?.[0]?.count || 0;

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

  async getSubscriptionFees() {
    const settings = await this.settingsService.getPlatformSettings();
    return {
      subscriptionMonthlyPrice: settings.subscriptionMonthlyPrice,
      subscriptionYearlyPrice: settings.subscriptionYearlyPrice,
      currency: "USD",
    };
  }

  async updateSubscriptionFees(
    payload: {
      subscriptionMonthlyPrice?: number;
      subscriptionYearlyPrice?: number;
    },
    adminId: string,
  ) {
    const settings = await this.settingsService.updatePlatformSettings(payload, adminId);
    return {
      subscriptionMonthlyPrice: settings.subscriptionMonthlyPrice,
      subscriptionYearlyPrice: settings.subscriptionYearlyPrice,
      currency: "USD",
    };
  }

  async listPremiumEventCreators(query: {
    page?: number;
    limit?: number;
    q?: string;
    paymentStatus?: "pending" | "complete" | "all";
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const searchRegex = query.q ? new RegExp(query.q, "i") : null;

    const activeSubscriptionRows = await Subscription.aggregate([
      {
        $match: {
          status: "active",
          endAt: { $gt: new Date() },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$userId",
          latestPlan: { $first: "$plan" },
          latestEndAt: { $first: "$endAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
      ...(searchRegex
        ? [
            {
              $match: {
                $or: [
                  { "user.fullName": searchRegex },
                  { "user.email": searchRegex },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: 0,
          creatorId: "$user._id",
          creatorName: "$user.fullName",
          creatorEmail: "$user.email",
          latestPlan: 1,
          latestEndAt: 1,
        },
      },
    ]);

    const creatorIds = activeSubscriptionRows.map((item: any) => item.creatorId);
    if (!creatorIds.length) {
      return {
        data: [],
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: 0,
          pageCount: 0,
          hasNext: false,
          hasPrev: page > 1,
        },
      };
    }

    const [eventStats, earningStats, payoutStats] = await Promise.all([
      Event.aggregate([
        { $match: { creatorId: { $in: creatorIds } } },
        {
          $group: {
            _id: "$creatorId",
            totalEvents: { $sum: 1 },
          },
        },
      ]),
      PaymentTransaction.aggregate([
        { $match: { status: "succeeded" } },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: { path: "$event", preserveNullAndEmptyArrays: false } },
        { $match: { "event.creatorId": { $in: creatorIds } } },
        {
          $group: {
            _id: "$event.creatorId",
            ticketSold: { $sum: 1 },
            totalEarnings: { $sum: "$creatorShareAmount" },
          },
        },
      ]),
      PayoutRequest.aggregate([
        { $match: { creatorId: { $in: creatorIds }, status: "paid" } },
        {
          $group: {
            _id: "$creatorId",
            totalPaidOut: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const eventStatsMap = new Map(
      eventStats.map((item: any) => [item._id.toString(), item]),
    );
    const earningStatsMap = new Map(
      earningStats.map((item: any) => [item._id.toString(), item]),
    );
    const payoutStatsMap = new Map(
      payoutStats.map((item: any) => [item._id.toString(), item]),
    );

    const merged = activeSubscriptionRows.map((creator: any) => {
      const id = creator.creatorId.toString();
      const eventRow = eventStatsMap.get(id);
      const earningRow = earningStatsMap.get(id);
      const payoutRow = payoutStatsMap.get(id);

      const totalCreatorEarnings = Number((earningRow?.totalEarnings || 0).toFixed(2));
      const totalPaidOut = Number((payoutRow?.totalPaidOut || 0).toFixed(2));
      const pendingAmount = Number((totalCreatorEarnings - totalPaidOut).toFixed(2));

      return {
        creatorId: id,
        creatorName: creator.creatorName,
        creatorEmail: creator.creatorEmail,
        totalEvents: eventRow?.totalEvents || 0,
        ticketSold: earningRow?.ticketSold || 0,
        totalEarnings: totalCreatorEarnings,
        paymentStatus: pendingAmount > 0 ? "pending" : "complete",
        pendingAmount: Math.max(0, pendingAmount),
        latestPlan: creator.latestPlan,
        expirationDate: creator.latestEndAt,
      };
    });

    const filtered = query.paymentStatus && query.paymentStatus !== "all"
      ? merged.filter((item) => item.paymentStatus === query.paymentStatus)
      : merged;

    filtered.sort((a, b) => b.totalEarnings - a.totalEarnings);

    const paged = filtered.slice(skip, skip + limit).map((item, idx) => ({
      sId: skip + idx + 1,
      ...item,
    }));

    const totalItems = filtered.length;

    return {
      data: paged,
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

  async getPremiumEventCreatorDetails(creatorId: string) {
    if (!Types.ObjectId.isValid(creatorId)) {
      throw new NotFoundException("Creator not found");
    }

    const creator = await User.findById(creatorId)
      .select("fullName email role creatorStatus")
      .exec();
    if (!creator) throw new NotFoundException("Creator not found");

    const [latestSubscription, eventRows, totalEvents, paymentSummary, payoutSummary] = await Promise.all([
      Subscription.findOne({ userId: creatorId }).sort({ createdAt: -1 }).exec(),
      Event.find({ creatorId })
        .select("title type startAt endAt status createdAt priceType ticketPrice discountPercentage")
        .sort({ createdAt: -1 })
        .limit(50)
        .exec(),
      Event.countDocuments({ creatorId }),
      PaymentTransaction.aggregate([
        { $match: { status: "succeeded" } },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: "$event" },
        { $match: { "event.creatorId": new Types.ObjectId(creatorId) } },
        {
          $group: {
            _id: null,
            ticketSold: { $sum: 1 },
            totalGross: { $sum: "$grossAmount" },
            totalEarnings: { $sum: "$creatorShareAmount" },
            totalAdminShare: { $sum: "$platformFeeAmount" },
          },
        },
      ]),
      PayoutRequest.aggregate([
        {
          $match: {
            creatorId: new Types.ObjectId(creatorId),
            status: "paid",
          },
        },
        {
          $group: {
            _id: null,
            totalPaidOut: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const payment = paymentSummary?.[0] || {
      ticketSold: 0,
      totalGross: 0,
      totalEarnings: 0,
      totalAdminShare: 0,
    };

    const totalPaidOut = payoutSummary?.[0]?.totalPaidOut || 0;
    const pendingAmount = Math.max(0, Number((payment.totalEarnings - totalPaidOut).toFixed(2)));

    return {
      creator: {
        id: creator._id.toString(),
        fullName: creator.fullName,
        email: creator.email,
        role: creator.role,
      },
      subscription: latestSubscription
        ? {
            id: latestSubscription._id.toString(),
            plan: latestSubscription.plan,
            status: latestSubscription.status,
            startAt: latestSubscription.startAt,
            endAt: latestSubscription.endAt,
          }
        : null,
      metrics: {
        totalEvents,
        ticketSold: payment.ticketSold,
        totalGross: Number(payment.totalGross.toFixed(2)),
        totalEarnings: Number(payment.totalEarnings.toFixed(2)),
        totalAdminShare: Number(payment.totalAdminShare.toFixed(2)),
        totalPaidOut: Number(totalPaidOut.toFixed(2)),
        pendingAmount,
        paymentStatus: pendingAmount > 0 ? "pending" : "complete",
      },
      events: eventRows,
    };
  }
}
