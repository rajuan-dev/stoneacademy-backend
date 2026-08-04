import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface ICommunityComment {
  _id: Types.ObjectId;
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  parentCommentId?: Types.ObjectId | null;
  text: string;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

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
    required: true,
    trim: true,
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
