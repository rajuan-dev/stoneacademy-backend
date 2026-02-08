import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

export interface IConversation {
  _id: Types.ObjectId;
  type: "direct" | "support";
  participantIds: Types.ObjectId[];
  lastMessageId?: Types.ObjectId | null;
  lastMessageText?: string | null;
  lastMessageAt?: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = BaseSchemaUtil.createSchema<IConversation>({
  type: {
    type: String,
    enum: ["direct", "support"],
    default: "direct",
    index: true,
  },
  participantIds: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  ],
  lastMessageId: {
    type: Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },
  lastMessageText: {
    type: String,
    default: null,
    trim: true,
  },
  lastMessageAt: {
    type: Date,
    default: null,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

conversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

export const Conversation = model<IConversation>(
  "Conversation",
  conversationSchema,
);
