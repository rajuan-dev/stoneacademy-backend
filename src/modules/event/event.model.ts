import { ACTIVITY_STATUS } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IEvent {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  title: string;
  typeCategoryId: Types.ObjectId;
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
  participantLimit?: number;
  media?: Types.ObjectId[];
  status: (typeof ACTIVITY_STATUS)[keyof typeof ACTIVITY_STATUS];
  ticketPrice: number;
  currency: string;
  stats?: {
    joinedCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = BaseSchemaUtil.createSchema<IEvent>({
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  typeCategoryId: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
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
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
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
  ticketPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "USD",
    trim: true,
  },
  stats: {
    joinedCount: {
      type: Number,
      default: 0,
    },
  },
});

eventSchema.index({ "location.coordinates": "2dsphere" });
eventSchema.index({ startAt: 1 });
eventSchema.index({ creatorId: 1 });

export const Event = model<IEvent>("Event", eventSchema);
