import { ACTIVITY_STATUS, PAGINATION, USER_STATUS } from "@/constants/app.constants";
import { NotFoundException } from "@/utils/app-error.utils";
import { PipelineStage, Types } from "mongoose";
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
import { AdminAccountService } from "../admin-account/admin-account.service";
import { AdminAccount } from "../admin-account/admin-account.model";
import type { StorageUploadInput } from "@/services/s3.service";

type AggregatedUserRow = {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  profileImageUrl?: string | null;
  username?: string | null;
  role: string;
  status: string;
  accountStatus?: string;
  createdAt: Date;
  joinedAt?: Date;
  blockedReason?: string | null;
  blockedAt?: Date | null;
  blockedByUser?: {
    _id?: Types.ObjectId;
    fullName?: string;
    email?: string;
  } | null;
};

type AdminUserListItem = {
  serial: number;
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  username: string | null;
  role: string;
  status: string;
  joinedAt: Date | null;
  isBlocked: boolean;
  blockedReason: string | null;
  blockedAt: Date | null;
  blockedBy: {
    id: string;
    fullName: string | null;
    email: string | null;
  } | null;
  actions: {
    canBlock: boolean;
    canUnblock: boolean;
    canViewDetails: boolean;
  };
};

type AdminUserDetail = {
  id: string;
  fullName: string;
  email: string;
  username: string | null;
  role: string;
  status: string;
  accountStatus: string;
  phone: string | null;
  joinedAt: Date | null;
  lastLoginAt: Date | null;
  blockedReason: string | null;
  blockedAt: Date | null;
  blockedBy: {
    id: string;
    fullName: string | null;
    email: string | null;
  } | null;
  actions: {
    canBlock: boolean;
    canUnblock: boolean;
  };
};

export class AdminService {
  private settingsService: SettingsService;
  private userService: UserService;
  private adminAccountService: AdminAccountService;

  constructor() {
    this.settingsService = new SettingsService();
    this.userService = new UserService();
    this.adminAccountService = new AdminAccountService();
  }

  private deriveUsername(email?: string | null): string | null {
    if (!email) return null;
    const [username] = email.split("@");
    return username || null;
  }

  private buildBlockedByPayload(
    blockedBy?: { _id?: Types.ObjectId; fullName?: string; email?: string } | null,
  ) {
    if (!blockedBy?._id) {
      return null;
    }
    return {
      id: blockedBy._id.toString(),
      fullName: blockedBy.fullName ?? null,
      email: blockedBy.email ?? null,
    };
  }

  private toAdminUserListItem(
    user: AggregatedUserRow,
    serial: number,
  ): AdminUserListItem {
    const username = user.username ?? this.deriveUsername(user.email);
    const isBlocked = user.status === USER_STATUS.BLOCKED;

    return {
      serial,
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.profileImageUrl ?? null,
      username,
      role: user.role,
      status: user.status,
      joinedAt: user.joinedAt ?? user.createdAt ?? null,
      isBlocked,
      blockedReason: user.blockedReason ?? null,
      blockedAt: user.blockedAt ?? null,
      blockedBy: this.buildBlockedByPayload(user.blockedByUser),
      actions: {
        canBlock: !isBlocked,
        canUnblock: isBlocked,
        canViewDetails: true,
      },
    };
  }

  private buildPaginationMeta(params: {
    page: number;
    limit: number;
    totalItems: number;
    serialStart: number;
  }) {
    const { page, limit, totalItems, serialStart } = params;
    const pageCount = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
    const hasNext = page * limit < totalItems;
    const hasPrev = page > 1;

    return {
      currentPage: page,
      totalPages: pageCount,
      totalItems,
      itemsPerPage: limit,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null,
      slNo: serialStart,
    };
  }

  private buildUserBasePipeline(options: {
    match: Record<string, any>;
    search?: string;
    sort?: Record<string, 1 | -1>;
  }): PipelineStage[] {
    const { match, search, sort } = options;
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $addFields: {
          username: {
            $let: {
              vars: { safeEmail: { $ifNull: ["$email", ""] } },
              in: {
                $cond: [
                  { $ne: ["$$safeEmail", ""] },
                  { $arrayElemAt: [{ $split: ["$$safeEmail", "@"] }, 0] },
                  null,
                ],
              },
            },
          },
        },
      },
    ];

    if (search) {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { fullName: { $regex: regex } },
            { email: { $regex: regex } },
            { username: { $regex: regex } },
          ],
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "blockedBy",
          foreignField: "_id",
          as: "blockedByUser",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$blockedByUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          email: 1,
          profileImageUrl: 1,
          username: 1,
          role: 1,
          status: 1,
          accountStatus: 1,
          createdAt: 1,
          joinedAt: "$createdAt",
          blockedReason: 1,
          blockedAt: 1,
          blockedByUser: 1,
        },
      },
      {
        $sort: sort || { createdAt: -1 },
      },
    );

    return pipeline;
  }

  private async paginateUsers(options: {
    page: number;
    limit: number;
    search?: string;
    match?: Record<string, any>;
    sort?: Record<string, 1 | -1>;
  }) {
    const page = options.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = options.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const pipeline: PipelineStage[] = this.buildUserBasePipeline({
      match: {
        isDeleted: false,
        ...(options.match || {}),
      },
      search: options.search?.trim(),
      sort: options.sort,
    });

    pipeline.push(
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
          ],
          totalItems: [{ $count: "value" }],
        },
      },
      {
        $project: {
          data: 1,
          totalItems: {
            $ifNull: [{ $arrayElemAt: ["$totalItems.value", 0] }, 0],
          },
        },
      },
    );

    const [result] = await User.aggregate(pipeline).exec();
    const rows = (result?.data || []) as AggregatedUserRow[];
    const totalItems = result?.totalItems ?? 0;
    const data = rows.map((row, index) =>
      this.toAdminUserListItem(row, skip + index + 1),
    );

    return {
      data,
      pagination: this.buildPaginationMeta({
        page,
        limit,
        totalItems,
        serialStart: data.length ? skip + 1 : 0,
      }),
    };
  }
  async getAdminProfile(adminId: string) {
    const admin = await this.adminAccountService.getById(adminId);
    if (!admin) {
      throw new NotFoundException("Admin account not found");
    }
    return this.adminAccountService.toProfileSummary(admin);
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

    let adminProfile: any = null;

    const hasUpdates =
      payload.fullName !== undefined
      || payload.email !== undefined
      || normalizedPhone !== undefined;

    if (hasUpdates) {
      adminProfile = await this.adminAccountService.updateProfile(adminId, {
        fullName: payload.fullName,
        email: payload.email,
        phone: normalizedPhone,
      });
    }

    if (photo) {
      adminProfile = await this.adminAccountService.updateProfilePhoto(
        adminId,
        photo,
      );
    }

    if (!adminProfile) {
      adminProfile = await this.adminAccountService.getById(adminId);
    }

    if (!adminProfile) {
      throw new NotFoundException("Admin account not found");
    }

    return this.adminAccountService.toProfileSummary(adminProfile);
  }

  async listUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      query.limit ?? PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT,
    );
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const searchRegex = search ? new RegExp(search, "i") : undefined;

    const userMatch: Record<string, any> = { isDeleted: false };
    const adminMatch: Record<string, any> = {};

    if (query.role) {
      userMatch.role = query.role;
      adminMatch.role = query.role;
    }

    if (query.status) {
      userMatch.status = query.status;
      adminMatch.status = query.status;
    }

    if (searchRegex) {
      userMatch.$or = [
        { fullName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ];
      adminMatch.$or = [
        { fullName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ];
    }

    const [users, admins] = await Promise.all([
      User.find(userMatch)
        .select(
          "_id fullName email role status createdAt blockedReason blockedAt profileImageUrl",
        )
        .lean(),
      AdminAccount.find(adminMatch)
        .select("_id fullName email role status createdAt profileImageUrl")
        .lean(),
    ]);

    const merged = [
      ...users.map((item) => ({
        _id: item._id,
        fullName: item.fullName,
        email: item.email,
        role: item.role,
        status: item.status,
        createdAt: item.createdAt,
        blockedReason: item.blockedReason ?? null,
        blockedAt: item.blockedAt ?? null,
        blockedBy: null as null,
        avatarUrl: item.profileImageUrl ?? null,
        source: "user" as const,
      })),
      ...admins.map((item) => ({
        _id: item._id,
        fullName: item.fullName,
        email: item.email,
        role: item.role,
        status: item.status,
        createdAt: item.createdAt,
        blockedReason: null,
        blockedAt: null,
        blockedBy: null as null,
        avatarUrl: item.profileImageUrl ?? null,
        source: "admin" as const,
      })),
    ].sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return right - left;
    });

    const paged = merged.slice(skip, skip + limit);
    const data = paged.map((item, index) => {
      const isBlocked = item.status === USER_STATUS.BLOCKED;
      return {
        serial: skip + index + 1,
        id: item._id.toString(),
        fullName: item.fullName,
        email: item.email,
        username: this.deriveUsername(item.email),
        role: item.role,
        status: item.status,
        joinedAt: item.createdAt ?? null,
        isBlocked,
        blockedReason: item.blockedReason,
        blockedAt: item.blockedAt,
        blockedBy: item.blockedBy,
        avatarUrl: item.avatarUrl,
        actions: {
          canBlock: item.source === "user" && !isBlocked,
          canUnblock: item.source === "user" && isBlocked,
          canViewDetails: true,
        },
      };
    });

    return {
      data,
      pagination: this.buildPaginationMeta({
        page,
        limit,
        totalItems: merged.length,
        serialStart: data.length ? skip + 1 : 0,
      }),
    };
  }

  async listBlockedUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      query.limit ?? PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT,
    );

    return this.paginateUsers({
      page,
      limit,
      search: query.search,
      match: { status: USER_STATUS.BLOCKED },
      sort: { blockedAt: -1, createdAt: -1 },
    });
  }

  async searchUsers(query: {
    q: string;
    limit?: number;
    role?: string;
    status?: string;
  }) {
    const limit = Math.min(query.limit ?? 10, 50);
    const pipeline = this.buildUserBasePipeline({
      match: {
        isDeleted: false,
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      search: query.q,
      sort: { createdAt: -1 },
    });

    pipeline.push({ $limit: limit });
    const rows = (await User.aggregate(pipeline).exec()) as AggregatedUserRow[];
    const items = rows.map((row, index) =>
      this.toAdminUserListItem(row, index + 1),
    );

    return {
      items,
      total: items.length,
    };
  }

  async updateUserStatus(
    userId: string,
    status: string,
    reason?: string | null,
    adminId?: string,
  ) {
    const update: Record<string, any> = { status };

    if (status === USER_STATUS.BLOCKED) {
      update.blockedReason = reason ?? null;
      update.blockedAt = new Date();
      update.blockedBy = adminId ? new Types.ObjectId(adminId) : null;
    } else if (status === USER_STATUS.ACTIVE) {
      update.blockedReason = null;
      update.blockedAt = null;
      update.blockedBy = null;
    } else if (reason !== undefined) {
      update.blockedReason = reason;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true },
    ).select("-passwordHash").exec();
    if (!user) throw new NotFoundException("User not found");

    if (adminId) {
      const action =
        status === USER_STATUS.BLOCKED
          ? "user_blocked"
          : status === USER_STATUS.ACTIVE
            ? "user_unblocked"
            : "user_status_updated";

      await AdminAuditLog.create({
        adminId,
        action,
        entityType: "user",
        entityId: user._id,
        meta: {
          status,
          reason: reason ?? null,
        },
      });
    }

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

  async getUserDetails(userId: string): Promise<AdminUserDetail> {
    const user = await User.findById(userId)
      .select("-passwordHash")
      .populate("blockedBy", "fullName email")
      .lean();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const blockedBy =
      typeof user.blockedBy === "object" && user.blockedBy !== null
        ? this.buildBlockedByPayload(user.blockedBy as any)
        : null;

    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      username: this.deriveUsername(user.email),
      role: user.role,
      status: user.status,
      accountStatus: user.accountStatus,
      phone: user.phone || user.phoneNumber || null,
      joinedAt: user.createdAt || null,
      lastLoginAt: user.lastLoginAt || null,
      blockedReason: user.blockedReason ?? null,
      blockedAt: user.blockedAt ?? null,
      blockedBy,
      actions: {
        canBlock: user.status !== USER_STATUS.BLOCKED,
        canUnblock: user.status === USER_STATUS.BLOCKED,
      },
    };
  }

  async blockUser(userId: string, adminId: string, reason?: string) {
    await this.updateUserStatus(
      userId,
      USER_STATUS.BLOCKED,
      reason ?? "Blocked by administrator",
      adminId,
    );
    return this.getUserDetails(userId);
  }

  async unblockUser(userId: string, adminId: string) {
    await this.updateUserStatus(userId, USER_STATUS.ACTIVE, undefined, adminId);
    return this.getUserDetails(userId);
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

  async dashboardAnalytics(query?: { year?: number }) {
    const selectedYear = query?.year ?? new Date().getFullYear();
    const startOfYear = new Date(selectedYear, 0, 1);
    const startOfNextYear = new Date(selectedYear + 1, 0, 1);
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const [userSeries, activitySeries, eventSeries, revenueSeries] =
      await Promise.all([
        User.aggregate([
          {
            $match: {
              createdAt: { $gte: startOfYear, $lt: startOfNextYear },
              isDeleted: false,
            },
          },
          {
            $group: {
              _id: { month: { $month: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.month": 1 } },
        ]),
        Activity.aggregate([
          { $match: { createdAt: { $gte: startOfYear, $lt: startOfNextYear } } },
          {
            $group: {
              _id: { month: { $month: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.month": 1 } },
        ]),
        Event.aggregate([
          { $match: { createdAt: { $gte: startOfYear, $lt: startOfNextYear } } },
          {
            $group: {
              _id: { month: { $month: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.month": 1 } },
        ]),
        PaymentTransaction.aggregate([
          {
            $match: {
              status: "succeeded",
              createdAt: { $gte: startOfYear, $lt: startOfNextYear },
            },
          },
          {
            $group: {
              _id: { month: { $month: "$createdAt" } },
              gross: { $sum: "$grossAmount" },
            },
          },
          { $sort: { "_id.month": 1 } },
        ]),
      ]);

    const usersByMonth = new Map<number, number>(
      userSeries.map((entry) => [Number(entry._id?.month), Number(entry.count) || 0]),
    );
    const activitiesByMonth = new Map<number, number>(
      activitySeries.map((entry) => [
        Number(entry._id?.month),
        Number(entry.count) || 0,
      ]),
    );
    const eventsByMonth = new Map<number, number>(
      eventSeries.map((entry) => [Number(entry._id?.month), Number(entry.count) || 0]),
    );
    const revenueByMonth = new Map<number, number>(
      revenueSeries.map((entry) => [
        Number(entry._id?.month),
        Number(entry.gross) || 0,
      ]),
    );

    const monthlyUsers = monthLabels.map((month, index) => ({
      month,
      users: usersByMonth.get(index + 1) || 0,
    }));

    return {
      year: selectedYear,
      monthlyUsers,
      users: monthLabels.map((month, index) => ({
        month,
        count: usersByMonth.get(index + 1) || 0,
      })),
      activities: monthLabels.map((month, index) => ({
        month,
        count: activitiesByMonth.get(index + 1) || 0,
      })),
      events: monthLabels.map((month, index) => ({
        month,
        count: eventsByMonth.get(index + 1) || 0,
      })),
      revenue: monthLabels.map((month, index) => ({
        month,
        gross: revenueByMonth.get(index + 1) || 0,
      })),
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
