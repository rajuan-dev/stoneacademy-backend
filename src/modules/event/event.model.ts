import { ACTIVITY_STATUS } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IEvent {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
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
  participantLimit?: number;
  media?: Types.ObjectId[];
  status: (typeof ACTIVITY_STATUS)[keyof typeof ACTIVITY_STATUS];
  priceType: "free" | "paid";
  ticketPrice: number;
  discountPercentage: number;
  durationMinutes?: number;
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
  priceType: {
    type: String,
    enum: ["free", "paid"],
    default: "free",
    index: true,
  },
  ticketPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  durationMinutes: {
    type: Number,
    min: 1,
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

export const Event = model<IEvent>("Event", eventSchema);
