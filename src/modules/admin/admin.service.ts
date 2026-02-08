import { PAGINATION } from "@/constants/app.constants";
import { NotFoundException } from "@/utils/app-error.utils";
import { User } from "../user/user.model";
import { Activity } from "../activity/activity.model";
import { Event } from "../event/event.model";
import { Report } from "../report/report.model";
import { SupportTicket } from "../support/support-ticket.model";
import { PaymentTransaction } from "../event/payment-transaction.model";

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

  async updateUserStatus(userId: string, status: string) {
    const user = await User.findByIdAndUpdate(
      userId,
      { status },
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
}
