import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { realtimeService } from "@/services/realtime.service";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  createDirectConversationSchema,
  listConversationsSchema,
  listMessagesSchema,
  markConversationReadSchema,
  sendMessageSchema,
  typingSchema,
} from "./message.schema";
import { MessageService } from "./message.service";

export class MessageController {
  private service: MessageService;

  constructor() {
    this.service = new MessageService();
  }

  listConversations = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listConversationsSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.listConversations(userId, validated.query);
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Conversations fetched successfully",
    );
  });

  createDirectConversation = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createDirectConversationSchema, req);
    const userId = req.user?.userId as string;
    const conversation = await this.service.createDirectConversation(
      userId,
      validated.body.participantId,
    );
    ApiResponse.created(res, conversation, "Conversation created successfully");
  });

  listMessages = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listMessagesSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.listMessages(
      userId,
      validated.params.conversationId,
      validated.query,
    );
    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Messages fetched successfully",
    );
  });

  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(sendMessageSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.sendMessage(userId, validated.body);

    realtimeService.emitChatMessageCreated({
      conversationId: result.conversation._id.toString(),
      participantIds: result.conversation.participantIds.map((id) => id.toString()),
      message: {
        _id: result.message._id.toString(),
        conversationId: result.message.conversationId.toString(),
        senderId: result.message.senderId.toString(),
        text: result.message.text,
        mediaIds: result.message.mediaIds.map((id) => id.toString()),
        readBy: result.message.readBy.map((entry) => ({
          userId: entry.userId.toString(),
          readAt: entry.readAt,
        })),
        createdAt: result.message.createdAt,
        updatedAt: result.message.updatedAt,
      },
    });

    ApiResponse.created(res, result.message, "Message sent successfully");
  });

  markConversationRead = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(markConversationReadSchema, req);
    const userId = req.user?.userId as string;
    const result = await this.service.markConversationRead(
      userId,
      validated.body.conversationId,
    );

    realtimeService.emitConversationRead({
      conversationId: result.conversationId,
      userId,
      readAt: result.readAt,
      markedCount: result.markedCount,
    });

    ApiResponse.success(res, result, "Conversation marked as read");
  });

  typing = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(typingSchema, req);
    const userId = req.user?.userId as string;
    const isParticipant = await this.service.validateParticipant(
      validated.body.conversationId,
      userId,
    );

    if (isParticipant) {
      realtimeService.emitTyping({
        conversationId: validated.body.conversationId,
        userId,
        isTyping: validated.body.isTyping,
      });
    }

    ApiResponse.success(res, { ok: true }, "Typing status emitted");
  });
}
