import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IReview {
  _id: Types.ObjectId;
  reviewerId: Types.ObjectId;
  targetUserId: Types.ObjectId;
  targetType: "activity" | "event";
  targetId: Types.ObjectId;
  rating: number;
  tags?: string[];
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = BaseSchemaUtil.createSchema<IReview>({
  reviewerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  targetUserId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    enum: ["activity", "event"],
    required: true,
    index: true,
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  tags: {
    type: [String],
    default: [],
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
});

reviewSchema.index(
  { reviewerId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);

export const Review = model<IReview>("Review", reviewSchema);
