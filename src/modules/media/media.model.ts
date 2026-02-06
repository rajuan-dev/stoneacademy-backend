// file: src/modules/media/media.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IMedia {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
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
}

const mediaSchema = BaseSchemaUtil.createSchema<IMedia>({
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
