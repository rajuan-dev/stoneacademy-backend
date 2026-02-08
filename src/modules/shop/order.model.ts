import { ORDER_STATUS } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface IOrder {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  currency: string;
  status: (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      trim: true,
    },
  },
  { _id: false },
);

const orderSchema = BaseSchemaUtil.createSchema<IOrder>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  items: {
    type: [orderItemSchema],
    default: [],
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    default: "USD",
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING,
    index: true,
  },
});

orderSchema.index({ createdAt: -1 });

export const Order = model<IOrder>("Order", orderSchema);
