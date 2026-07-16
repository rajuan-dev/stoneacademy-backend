import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IAd {
  _id: Types.ObjectId;
  name: string;
  category?: string;
  description?: string;
  price?: number;
  imageUrl: string;
  linkUrl: string;
  country?: string;
  state?: string;
  city?: string;
  status: "active" | "expired";
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
  category: {
    type: String,
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  price: {
    type: Number,
    min: 0,
    default: 0,
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
  country: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  state: {
    type: String,
    trim: true,
    index: true,
  },
  city: {
    type: String,
    trim: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["active", "expired"],
    default: "active",
    index: true,
  },
});

adSchema.index({ country: 1, state: 1, city: 1, status: 1 });

export const Ad = model<IAd>("Ad", adSchema);
