import { PAGINATION } from "@/constants/app.constants";
import { NotFoundException } from "@/utils/app-error.utils";
import { User } from "../user/user.model";
import { Notification } from "./notification.model";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  activityJoined: true,
  activityLeft: true,
  activityUpdated: true,
  activityCancelled: true,
  eventJoined: true,
  eventLeft: true,
  eventUpdated: true,
  eventCancelled: true,
  messages: true,
  reviews: true,
  support: true,
  payouts: true,
  reportStatusUpdated: true,
  reportModeration: true,
  contentReported: true,
  system: true,
} as const;

type NotificationPreferenceKey = keyof typeof DEFAULT_NOTIFICATION_PREFERENCES;

export class NotificationService {
  async list(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      type?: string;
      isRead?: boolean;
      entityType?: string;
      entityId?: string;
    },
  ) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId };
    if (query.type) filter.type = query.type;
    if (typeof query.isRead === "boolean") filter.isRead = query.isRead;
    if (query.entityType) filter["data.entityType"] = query.entityType;
    if (query.entityId) filter["data.entityId"] = query.entityId;

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

  async getPreferences(userId: string) {
    const user = await User.findById(userId)
      .select("notificationPreferences")
      .lean();

    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(user?.notificationPreferences || {}),
    };
  }

  async updatePreferences(
    userId: string,
    payload: Partial<Record<NotificationPreferenceKey, boolean>>,
  ) {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: Object.fromEntries(
          Object.entries(payload).map(([key, value]) => [
            `notificationPreferences.${key}`,
            value,
          ]),
        ),
      },
      { new: true },
    )
      .select("notificationPreferences")
      .lean();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(user.notificationPreferences || {}),
    };
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }) {
    const enabled = await this.isNotificationEnabled(data.userId, data.type);
    if (!enabled) return null;

    return Notification.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.payload || {},
    });
  }

  async createMany(
    items: Array<{
      userId: string;
      type: string;
      title: string;
      body: string;
      payload?: Record<string, unknown>;
    }>,
  ) {
    const results = await Promise.all(items.map((item) => this.create(item)));
    return results.filter(Boolean);
  }

  private async isNotificationEnabled(userId: string, type: string) {
    const preferenceKey = this.mapTypeToPreference(type);
    if (!preferenceKey) return true;

    const user = await User.findById(userId)
      .select("notificationPreferences")
      .lean();

    const preferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(user?.notificationPreferences || {}),
    };

    return preferences[preferenceKey] !== false;
  }

  private mapTypeToPreference(type: string): NotificationPreferenceKey | null {
    const mapping: Record<string, NotificationPreferenceKey> = {
      activity_joined: "activityJoined",
      activity_join_success: "activityJoined",
      activity_left: "activityLeft",
      activity_updated: "activityUpdated",
      activity_cancelled: "activityCancelled",
      event_joined: "eventJoined",
      event_join_success: "eventJoined",
      event_left: "eventLeft",
      event_updated: "eventUpdated",
      event_cancelled: "eventCancelled",
      new_message: "messages",
      rating_received: "reviews",
      support_reply: "support",
      payout_completed: "payouts",
      payout_status_updated: "payouts",
      report_status_updated: "reportStatusUpdated",
      report_warning: "reportModeration",
      account_disabled: "reportModeration",
      account_recovered: "reportModeration",
      content_reported: "contentReported",
    };

    return mapping[type] || "system";
  }
}

export const notificationService = new NotificationService();
