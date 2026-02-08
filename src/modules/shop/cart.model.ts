import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface ICart {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
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

const cartSchema = BaseSchemaUtil.createSchema<ICart>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },
  items: {
    type: [cartItemSchema],
    default: [],
  },
});

export const Cart = model<ICart>("Cart", cartSchema);
