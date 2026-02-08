import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IAd {
  _id: Types.ObjectId;
  name: string;
  imageUrl: string;
  linkUrl: string;
  status: "active" | "expired";
  startsAt?: Date;
  endsAt?: Date;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const adSchema = BaseSchemaUtil.createSchema<IAd>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  imageUrl: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  linkUrl: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  status: {
    type: String,
    enum: ["active", "expired"],
    default: "active",
    index: true,
  },
  startsAt: {
    type: Date,
  },
  endsAt: {
    type: Date,
  },
  order: {
    type: Number,
    default: 0,
  },
});

adSchema.index({ status: 1, startsAt: 1, endsAt: 1 });

export const Ad = model<IAd>("Ad", adSchema);
