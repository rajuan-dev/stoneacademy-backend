import type { UserResponse } from "@/modules/user/user.type";
import type { ChatMessageType, ChatThreadType } from "./chat.interface";

export type ChatThreadSummary = {
  _id: string;
  type: ChatThreadType;
  memberUserIds: string[];
  memberCount?: number;
  directPeer?: UserResponse | null;
  lastMessage?: ChatMessageResponse | null;
  unreadCount: number;
  hasUnseenLastMessage: boolean;
  updatedAt: Date;
  createdAt: Date;
};

export type ChatMessageResponse = {
  _id: string;
  threadId: string;
  senderUserId: string;
  type: ChatMessageType;
  text?: string | null;
  imageUrl?: string | null;
  seenByUserIds: string[];
  isSeenByCurrentUser?: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender?: UserResponse | null;
};

export type ChatThreadMessagesResponse = {
  threadId: string;
  messages: ChatMessageResponse[];
};

export type SendThreadMessagePayload = {
  threadId: string;
  type: ChatMessageType;
  text?: string;
  imageUrl?: string;
};
