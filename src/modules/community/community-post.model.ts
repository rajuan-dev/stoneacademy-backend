import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";
import type { CommunityLocation } from "./community.type";

export interface ICommunityPost {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  text?: string | null;
  media: Types.ObjectId[];
  location?: CommunityLocation;
  eventId?: Types.ObjectId | null;
  link?: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const pointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  { _id: false },
);

const locationSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
    },
    coordinates: {
      type: pointSchema,
      required: true,
    },
  },
  { _id: false },
);

const communityPostSchema = BaseSchemaUtil.createSchema<ICommunityPost>({
  authorId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  text: {
    type: String,
    trim: true,
  },
  media: [
    {
      type: Schema.Types.ObjectId,
      ref: "Media",
    },
  ],
  location: {
    type: locationSchema,
    default: undefined,
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event",
    default: null,
  },
  link: {
    type: String,
    trim: true,
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  commentCount: {
    type: Number,
    default: 0,
    min: 0,
  },
});

communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ authorId: 1, createdAt: -1 });
communityPostSchema.index({ eventId: 1, createdAt: -1 });

export const CommunityPost = model<ICommunityPost>(
  "CommunityPost",
  communityPostSchema,
);
