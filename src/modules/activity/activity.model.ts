// file: src/modules/activity/activity.model.ts

import { ACTIVITY_STATUS } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IActivity {
  _id: Types.ObjectId;
  hostId: Types.ObjectId;
  title: string;
  type: string;
  description?: string;
  startAt: Date;
  endAt?: Date;
  location?: {
    label?: string;
    coordinates?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  distanceMiles?: number;
  participantLimit?: number;
  media?: Types.ObjectId[];
  status: (typeof ACTIVITY_STATUS)[keyof typeof ACTIVITY_STATUS];
  stats?: {
    joinedCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = BaseSchemaUtil.createSchema<IActivity>({
  hostId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startAt: {
    type: Date,
    required: true,
  },
  endAt: {
    type: Date,
  },
  location: {
    label: {
      type: String,
      trim: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
  },
  distanceMiles: {
    type: Number,
    min: 0,
  },
  participantLimit: {
    type: Number,
    min: 1,
  },
  media: [
    {
      type: Schema.Types.ObjectId,
      ref: "Media",
    },
  ],
  status: {
    type: String,
    enum: Object.values(ACTIVITY_STATUS),
    default: ACTIVITY_STATUS.DRAFT,
    index: true,
  },
  stats: {
    joinedCount: {
      type: Number,
      default: 0,
    },
  },
});

activitySchema.index({ "location.coordinates": "2dsphere" });
activitySchema.index({ startAt: 1 });
activitySchema.index({ hostId: 1 });
activitySchema.index({ createdAt: -1 });
activitySchema.index({ status: 1, createdAt: -1 });
activitySchema.index({ hostId: 1, createdAt: -1 });

export const Activity = model<IActivity>("Activity", activitySchema);
