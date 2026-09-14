import type { Document, Types } from "mongoose";

export type ChatThreadType = "direct";

export type IChatThread = {
  type: ChatThreadType;
  memberUserIds: Types.ObjectId[];
  directKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
} & Document;

export type ChatMessageType = "text" | "image";

export type IChatMessage = {
  threadId: Types.ObjectId;
  senderUserId: Types.ObjectId;
  type: ChatMessageType;
  text?: string | null;
  imageUrl?: string | null;
  seenByUserIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
} & Document;
