import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IProduct {
  _id: Types.ObjectId;
  name: string;
  category?: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  ctaUrl: string;
  rating?: {
    avg: number;
    count: number;
  };
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = BaseSchemaUtil.createSchema<IProduct>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  category: {
    type: String,
    trim: true,
    maxlength: 80,
    index: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 3000,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "USD",
    trim: true,
  },
  imageUrl: {
    type: String,
    trim: true,
  },
  ctaUrl: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  rating: {
    avg: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 },
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

productSchema.index({ name: "text", description: "text" });

export const Product = model<IProduct>("Product", productSchema);
