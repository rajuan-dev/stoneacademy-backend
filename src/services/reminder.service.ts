import cron from "node-cron";
import dayjs from "dayjs";
import { env } from "@/env";
import { ACTIVITY_STATUS, PARTICIPANT_STATUS } from "@/constants/app.constants";
import { Activity } from "@/modules/activity/activity.model";
import { ActivityParticipant } from "@/modules/activity/activity-participant.model";
import { Event } from "@/modules/event/event.model";
import { EventParticipant } from "@/modules/event/event-participant.model";
import { Notification } from "@/modules/notification/notification.model";

const WINDOW_MINUTES = 5;

class ReminderService {
  private task?: cron.ScheduledTask;

  start(): void {
    if (this.task) return;
    this.task = cron.schedule("*/5 * * * *", () => {
      this.run().catch(() => {
        // swallow; logged in run
      });
    });
  }

  async run(): Promise<void> {
    const reminderMinutes = env.REMINDER_MINUTES ?? 30;
    const now = dayjs();
    const remindAt = now.add(reminderMinutes, "minute");
    const windowEnd = remindAt.add(WINDOW_MINUTES, "minute");

    await Promise.all([
      this.handleActivityReminders(remindAt.toDate(), windowEnd.toDate(), reminderMinutes),
      this.handleEventReminders(remindAt.toDate(), windowEnd.toDate(), reminderMinutes),
    ]);
  }

  private async handleActivityReminders(start: Date, end: Date, minutes: number) {
    const activities = await Activity.find({
      status: ACTIVITY_STATUS.PUBLISHED,
      startAt: { $gte: start, $lt: end },
    }).select("_id title startAt").exec();

    for (const activity of activities) {
      const participants = await ActivityParticipant.find({
        activityId: activity._id,
        status: PARTICIPANT_STATUS.JOINED,
      }).select("userId").exec();

      for (const participant of participants) {
        const reminderKey = `activity:${activity._id}:${start.toISOString()}`;
        const exists = await Notification.findOne({
          userId: participant.userId,
          type: "activity_reminder",
          "data.reminderKey": reminderKey,
        }).select("_id").exec();
        if (exists) continue;

        await Notification.create({
          userId: participant.userId,
          type: "activity_reminder",
          title: "Activity starting soon",
          body: `Your activity starts in ${minutes} minutes.`,
          data: {
            activityId: activity._id.toString(),
            startAt: activity.startAt,
            reminderKey,
          },
        });
      }
    }
  }

  private async handleEventReminders(start: Date, end: Date, minutes: number) {
    const events = await Event.find({
      status: ACTIVITY_STATUS.PUBLISHED,
      startAt: { $gte: start, $lt: end },
    }).select("_id title startAt").exec();

    for (const event of events) {
      const participants = await EventParticipant.find({
        eventId: event._id,
        status: PARTICIPANT_STATUS.JOINED,
      }).select("userId").exec();

      for (const participant of participants) {
        const reminderKey = `event:${event._id}:${start.toISOString()}`;
        const exists = await Notification.findOne({
          userId: participant.userId,
          type: "event_reminder",
          "data.reminderKey": reminderKey,
        }).select("_id").exec();
        if (exists) continue;

        await Notification.create({
          userId: participant.userId,
          type: "event_reminder",
          title: "Event starting soon",
          body: `Your event starts in ${minutes} minutes.`,
          data: {
            eventId: event._id.toString(),
            startAt: event.startAt,
            reminderKey,
          },
        });
      }
    }
  }
}

export const reminderService = new ReminderService();
