import { PAGINATION } from "@/constants/app.constants";
import { notificationService } from "@/modules/notification/notification.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type { Types } from "mongoose";
import { Conversation } from "./conversation.model";
import { Message } from "./message.model";

export class MessageService {
  async listConversations(
    userId: string,
    query: {
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter = { participantIds: userId };

    const [data, totalItems] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Conversation.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  async createDirectConversation(userId: string, participantId: string) {
    if (userId === participantId) {
      throw new BadRequestException("Cannot create conversation with yourself");
    }

    const participantIds = [userId, participantId].sort();

    const existing = await Conversation.findOne({
      type: "direct",
      participantIds: { $all: participantIds },
      $expr: { $eq: [{ $size: "$participantIds" }, 2] },
    }).exec();

    if (existing) {
      return existing;
    }

    return Conversation.create({
      type: "direct",
      participantIds,
      createdBy: userId,
    });
  }

  async listMessages(
    userId: string,
    conversationId: string,
    query: {
      page?: number;
      limit?: number;
    },
  ) {
    const conversation = await this.getConversationForUser(userId, conversationId);

    const page = query.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter = { conversationId: conversation._id };

    const [dataDesc, totalItems] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Message.countDocuments(filter),
    ]);

    const data = dataDesc.reverse();

    return {
      conversation,
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        pageCount: Math.ceil(totalItems / limit),
        hasNext: page * limit < totalItems,
        hasPrev: page > 1,
      },
    };
  }

  async sendMessage(
    userId: string,
    payload: {
      conversationId: string;
      text?: string;
      mediaIds?: string[];
    },
  ) {
    const conversation = await this.getConversationForUser(
      userId,
      payload.conversationId,
    );

    const text = payload.text?.trim();
    if ((!text || text.length === 0) && (!payload.mediaIds || payload.mediaIds.length === 0)) {
      throw new BadRequestException("Message must contain text or media");
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: userId,
      text,
      mediaIds: payload.mediaIds || [],
      readBy: [
        {
          userId,
          readAt: new Date(),
        },
      ],
    });

    conversation.lastMessageId = message._id as Types.ObjectId;
    conversation.lastMessageText = text || (payload.mediaIds?.length ? "[media]" : null);
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    const recipientIds = conversation.participantIds
      .map((id) => id.toString())
      .filter((participantId) => participantId !== userId);

    await Promise.all(
      recipientIds.map((recipientId) =>
        notificationService.create({
          userId: recipientId,
          type: "new_message",
          title: "New message",
          body: text || "You received a new media message.",
          payload: {
            conversationId: conversation._id.toString(),
            messageId: message._id.toString(),
            senderId: userId,
          },
        }),
      ),
    );

    return { conversation, message };
  }

  async markConversationRead(userId: string, conversationId: string) {
    const conversation = await this.getConversationForUser(userId, conversationId);

    const unreadMessages = await Message.find({
      conversationId: conversation._id,
      readBy: { $not: { $elemMatch: { userId } } },
    }).exec();

    const now = new Date();
    await Promise.all(
      unreadMessages.map((message) => {
        message.readBy.push({ userId: userId as any, readAt: now });
        return message.save();
      }),
    );

    return {
      conversationId,
      markedCount: unreadMessages.length,
      readAt: now,
    };
  }

  async validateParticipant(conversationId: string, userId: string) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participantIds: userId,
    }).exec();

    return Boolean(conversation);
  }

  private async getConversationForUser(userId: string, conversationId: string) {
    const conversation = await Conversation.findById(conversationId).exec();
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const isParticipant = conversation.participantIds.some(
      (participantId) => participantId.toString() === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException("You are not a participant of this conversation");
    }

    return conversation;
  }
}
