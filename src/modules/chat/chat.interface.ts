import type { Document, Types } from "mongoose";

export type ChatThreadType = "direct";

export interface IChatThread extends Document {
  type: ChatThreadType;
  memberUserIds: Types.ObjectId[];
  directKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatMessageType = "text" | "image";

export interface IChatMessage extends Document {
  threadId: Types.ObjectId;
  senderUserId: Types.ObjectId;
  type: ChatMessageType;
  text?: string | null;
  imageUrl?: string | null;
  seenByUserIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
