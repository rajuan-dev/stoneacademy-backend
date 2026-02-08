import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface ISettings {
  _id: Types.ObjectId;
  key: string;
  value: Record<string, any>;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = BaseSchemaUtil.createSchema<ISettings>({
  key: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true,
  },
  value: {
    type: Schema.Types.Mixed,
    default: {},
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

export const Settings = model<ISettings>("Settings", settingsSchema);
