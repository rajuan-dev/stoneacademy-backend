import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IMessageRead {
  userId: Types.ObjectId;
  readAt: Date;
}

export interface IMessage {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  text?: string;
  mediaIds: Types.ObjectId[];
  readBy: IMessageRead[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = BaseSchemaUtil.createSchema<IMessage>({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  text: {
    type: String,
    trim: true,
    maxlength: 4000,
  },
  mediaIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "Media",
    },
  ],
  readBy: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      readAt: {
        type: Date,
        required: true,
      },
    },
  ],
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, "readBy.userId": 1 });

export const Message = model<IMessage>("Message", messageSchema);
