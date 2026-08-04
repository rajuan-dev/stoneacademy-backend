import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface ICommunityLike {
  _id: Types.ObjectId;
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const communityLikeSchema = BaseSchemaUtil.createSchema<ICommunityLike>({
  postId: {
    type: Schema.Types.ObjectId,
    ref: "CommunityPost",
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

communityLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const CommunityLike = model<ICommunityLike>(
  "CommunityLike",
  communityLikeSchema,
);
