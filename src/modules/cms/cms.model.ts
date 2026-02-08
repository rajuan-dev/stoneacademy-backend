import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface ICmsPage {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  content: string;
  version: number;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const cmsPageSchema = BaseSchemaUtil.createSchema<ICmsPage>({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20000,
  },
  version: {
    type: Number,
    default: 1,
    min: 1,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

export const CmsPage = model<ICmsPage>("CmsPage", cmsPageSchema);
