// file: src/modules/media/media.model.ts

import type { Types } from "mongoose";

import { model, Schema } from "mongoose";

import { BaseSchemaUtil } from "@/utils/base-schema.utils";

export type IMedia = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  ownerModel?: "User" | "Admin";
  type: "image" | "video";
  s3Bucket: string;
  s3Key: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  createdAt: Date;
  updatedAt: Date;
};

const mediaSchema = BaseSchemaUtil.createSchema<IMedia>({
  ownerId: {
    type: Schema.Types.ObjectId,
    refPath: "ownerModel",
    required: true,
    index: true,
  },
  ownerModel: {
    type: String,
    enum: ["User", "Admin"],
    default: "User",
    index: true,
  },
  type: {
    type: String,
    enum: ["image", "video"],
    required: true,
    index: true,
  },
  s3Bucket: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
    index: true,
  },
  url: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
  },
  sizeBytes: {
    type: Number,
  },
  width: {
    type: Number,
  },
  height: {
    type: Number,
  },
  durationSec: {
    type: Number,
  },
});

export const Media = model<IMedia>("Media", mediaSchema);
