import { PAGINATION } from "@/constants/app.constants";
import { NotFoundException } from "@/utils/app-error.utils";
import { AdminNotification } from "./admin-notification.model";

export class AdminNotificationService {
  async list(adminId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter = { $or: [{ adminId }, { adminId: null }] };

    const [data, totalItems] = await Promise.all([
      AdminNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      AdminNotification.countDocuments(filter),
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

  async unreadCount(adminId: string) {
    const count = await AdminNotification.countDocuments({
      $or: [{ adminId }, { adminId: null }],
      isRead: false,
    });
    return { count };
  }

  async markRead(adminId: string, id: string) {
    const item = await AdminNotification.findOne({
      _id: id,
      $or: [{ adminId }, { adminId: null }],
    }).exec();
    if (!item) {
      throw new NotFoundException("Notification not found");
    }
    if (!item.isRead) {
      item.isRead = true;
      item.readAt = new Date();
      await item.save();
    }
    return item;
  }

  async markReadAll(adminId: string) {
    const result = await AdminNotification.updateMany(
      { $or: [{ adminId }, { adminId: null }], isRead: false },
      { isRead: true, readAt: new Date() },
    ).exec();
    return { updatedCount: result.modifiedCount };
  }

  async create(data: {
    adminId?: string | null;
    type: string;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }) {
    return AdminNotification.create({
      adminId: data.adminId ?? null,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.payload || {},
    });
  }
}

export const adminNotificationService = new AdminNotificationService();
