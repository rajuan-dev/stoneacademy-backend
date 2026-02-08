// file: src/services/realtime.service.ts

import { logger } from "@/middlewares/pino-logger";
import { env } from "@/env";
import { AuthUtil } from "@/modules/auth/auth.utils";
import type { JWTPayload } from "@/modules/user/user.type";
import { Conversation } from "@/modules/message/conversation.model";
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";

type AuthenticatedSocket = Socket & {
  data: {
    userId?: string;
    role?: string;
    email?: string;
  };
};

export type ReportSubmittedEvent = {
  quoteId: string;
  submittedBy: string;
  assignedCleanerIds: string[];
  reportStatus: string;
  submittedAt: string;
};

export type ChatMessageCreatedEvent = {
  conversationId: string;
  participantIds: string[];
  message: {
    _id: string;
    conversationId: string;
    senderId: string;
    text?: string;
    mediaIds: string[];
    readBy: Array<{ userId: string; readAt: Date }>;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type ConversationReadEvent = {
  conversationId: string;
  userId: string;
  readAt: Date;
  markedCount: number;
};

export type TypingEvent = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

class RealtimeService {
  private io?: Server;

  initialize(server: HttpServer): void {
    if (this.io) {
      return;
    }

    const allowedOrigins = this.parseAllowedOrigins(env.CLIENT_URL);

    this.io = new Server(server, {
      path: "/ws",
      cors: {
        origin: allowedOrigins.length ? allowedOrigins : true,
        credentials: true,
      },
    });

    this.io.use((socket, next) => {
      try {
        const token = this.extractToken(socket as AuthenticatedSocket);
        if (!token) {
          return next(new Error("Unauthorized"));
        }
        const payload = AuthUtil.verifyAccessToken(token) as JWTPayload;
        socket.data.userId = payload.userId;
        socket.data.role = payload.role;
        socket.data.email = payload.email;
        socket.join(this.userRoom(payload.userId));
        return next();
      } catch (error) {
        logger.warn({ error }, "WebSocket authentication failed");
        return next(new Error("Unauthorized"));
      }
    });

    this.io.on("connection", (socket) => {
      logger.info(
        { userId: socket.data.userId, socketId: socket.id },
        "WebSocket connected"
      );

      socket.emit("presence:status", {
        userId: socket.data.userId,
        isOnline: true,
        at: new Date(),
      });

      socket.on("chat:conversation:join", async (conversationId: string) => {
        try {
          if (!socket.data.userId || !conversationId) return;
          const isParticipant = await this.isParticipant(
            conversationId,
            socket.data.userId,
          );
          if (!isParticipant) return;

          socket.join(this.conversationRoom(conversationId));
        } catch (error) {
          logger.warn({ error, conversationId }, "Failed to join chat conversation room");
        }
      });

      socket.on("chat:typing", async (payload: TypingEvent) => {
        try {
          if (!socket.data.userId) return;
          if (!payload?.conversationId) return;
          const isParticipant = await this.isParticipant(
            payload.conversationId,
            socket.data.userId,
          );
          if (!isParticipant) return;

          socket.to(this.conversationRoom(payload.conversationId)).emit("chat:typing", {
            conversationId: payload.conversationId,
            userId: socket.data.userId,
            isTyping: Boolean(payload.isTyping),
          });
        } catch (error) {
          logger.warn({ error }, "Failed to emit typing event");
        }
      });

      socket.on("disconnect", (reason) => {
        logger.debug(
          { userId: socket.data.userId, socketId: socket.id, reason },
          "WebSocket disconnected"
        );

        if (socket.data.userId) {
          this.io
            ?.to(this.userRoom(socket.data.userId))
            .emit("presence:status", {
              userId: socket.data.userId,
              isOnline: false,
              at: new Date(),
            });
        }
      });
    });
  }

  emitChatMessageCreated(event: ChatMessageCreatedEvent): void {
    if (!this.io) {
      return;
    }

    const room = this.conversationRoom(event.conversationId);
    this.io.to(room).emit("chat:message:new", event.message);

    event.participantIds.forEach((participantId) => {
      this.io!.to(this.userRoom(participantId)).emit("chat:message:new", event.message);
    });
  }

  emitConversationRead(event: ConversationReadEvent): void {
    if (!this.io) {
      return;
    }

    const payload = {
      conversationId: event.conversationId,
      userId: event.userId,
      readAt: event.readAt,
      markedCount: event.markedCount,
    };

    this.io.to(this.conversationRoom(event.conversationId)).emit("chat:read", payload);
  }

  emitTyping(event: TypingEvent): void {
    if (!this.io) {
      return;
    }

    this.io.to(this.conversationRoom(event.conversationId)).emit("chat:typing", {
      conversationId: event.conversationId,
      userId: event.userId,
      isTyping: event.isTyping,
    });
  }

  emitReportSubmitted(event: ReportSubmittedEvent): void {
    if (!this.io) {
      logger.warn(
        { quoteId: event.quoteId },
        "WebSocket server not initialized; skipping report:submitted emit"
      );
      return;
    }

    const uniqueRecipients = Array.from(
      new Set(event.assignedCleanerIds.filter(Boolean))
    );

    const payload = {
      quoteId: event.quoteId,
      submittedBy: event.submittedBy,
      submittedAt: event.submittedAt,
      reportStatus: event.reportStatus,
    };

    uniqueRecipients.forEach((cleanerId) => {
      this.io!.to(this.userRoom(cleanerId)).emit("report:submitted", payload);
    });
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private extractToken(socket: AuthenticatedSocket): string | undefined {
    const headerToken =
      (socket.handshake.headers.authorization as string | undefined)?.replace(
        /^Bearer\s+/i,
        ""
      );
    const authToken =
      typeof socket.handshake.auth?.token === "string"
        ? socket.handshake.auth.token
        : undefined;
    const queryToken = socket.handshake.query?.token;

    if (typeof queryToken === "string") {
      return queryToken;
    }
    if (authToken) {
      return authToken;
    }
    if (headerToken) {
      return headerToken;
    }
    return undefined;
  }

  private parseAllowedOrigins(value?: string): string[] {
    if (!value) return [];
    return value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  private async isParticipant(conversationId: string, userId: string) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participantIds: userId,
    }).select("_id").exec();

    return Boolean(conversation);
  }
}

export const realtimeService = new RealtimeService();
