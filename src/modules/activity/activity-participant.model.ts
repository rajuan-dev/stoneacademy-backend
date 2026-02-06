// file: src/modules/activity/activity-participant.model.ts

import { PARTICIPANT_STATUS } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IActivityParticipant {
  _id: Types.ObjectId;
  activityId: Types.ObjectId;
  userId: Types.ObjectId;
  status: (typeof PARTICIPANT_STATUS)[keyof typeof PARTICIPANT_STATUS];
  joinedAt?: Date;
  qrTokenId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const activityParticipantSchema =
  BaseSchemaUtil.createSchema<IActivityParticipant>({
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PARTICIPANT_STATUS),
      default: PARTICIPANT_STATUS.JOINED,
      index: true,
    },
    joinedAt: {
      type: Date,
    },
    qrTokenId: {
      type: Schema.Types.ObjectId,
      ref: "QrToken",
    },
  });

activityParticipantSchema.index({ activityId: 1, userId: 1 }, { unique: true });

export const ActivityParticipant = model<IActivityParticipant>(
  "ActivityParticipant",
  activityParticipantSchema,
);
