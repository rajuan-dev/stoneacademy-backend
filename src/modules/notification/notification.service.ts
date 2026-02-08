import { PAGINATION } from "@/constants/app.constants";
import { NotFoundException } from "@/utils/app-error.utils";
import { Notification } from "./notification.model";

export class NotificationService {
  async list(userId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter = { userId };

    const [data, totalItems] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Notification.countDocuments(filter),
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

  async unreadCount(userId: string) {
    const count = await Notification.countDocuments({ userId, isRead: false });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const item = await Notification.findOne({ _id: id, userId }).exec();
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

  async markReadAll(userId: string) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    ).exec();
    return { updatedCount: result.modifiedCount };
  }

  async remove(userId: string, id: string) {
    const result = await Notification.deleteOne({ _id: id, userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException("Notification not found");
    }
    return { deleted: true };
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }) {
    return Notification.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.payload || {},
    });
  }
}

export const notificationService = new NotificationService();
