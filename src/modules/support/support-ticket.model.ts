import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, type Types } from "mongoose";

interface ITicketMessage {
  senderId: Types.ObjectId;
  senderRole: "user" | "admin";
  message: string;
  createdAt: Date;
}

export interface ISupportTicket {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  category: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  messages: ITicketMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema = BaseSchemaUtil.createSchema<ISupportTicket>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 250,
  },
  status: {
    type: String,
    enum: ["open", "in_progress", "resolved", "closed"],
    default: "open",
    index: true,
  },
  messages: [
    {
      senderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      senderRole: {
        type: String,
        enum: ["user", "admin"],
        required: true,
      },
      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 4000,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

export const SupportTicket = model<ISupportTicket>(
  "SupportTicket",
  supportTicketSchema,
);
