import type { Types } from "mongoose";

import { model, Schema } from "mongoose";

import { BaseSchemaUtil } from "@/utils/base-schema.utils";

export type ICommunityComment = {
  _id: Types.ObjectId;
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  parentCommentId?: Types.ObjectId | null;
  text?: string | null;
  eventId?: Types.ObjectId | null;
  activityId?: Types.ObjectId | null;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
};

const communityCommentSchema = BaseSchemaUtil.createSchema<ICommunityComment>({
  postId: {
    type: Schema.Types.ObjectId,
    ref: "CommunityPost",
    required: true,
    index: true,
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  parentCommentId: {
    type: Schema.Types.ObjectId,
    ref: "CommunityComment",
    default: null,
  },
  text: {
    type: String,
    trim: true,
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event",
    default: null,
  },
  activityId: {
    type: Schema.Types.ObjectId,
    ref: "Activity",
    default: null,
  },
  replyCount: {
    type: Number,
    default: 0,
    min: 0,
  },
});

communityCommentSchema.index({ postId: 1, parentCommentId: 1, createdAt: 1 });
communityCommentSchema.index({ parentCommentId: 1, createdAt: 1 });

export const CommunityComment = model<ICommunityComment>(
  "CommunityComment",
  communityCommentSchema,
);
