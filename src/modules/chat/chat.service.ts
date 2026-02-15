import { ROLES, USER_STATUS } from "@/constants/app.constants";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { Types } from "mongoose";
import { Activity } from "../activity/activity.model";
import { Event } from "../event/event.model";
import { User } from "../user/user.model";
import { UserService } from "../user/user.service";
import type { IChatMessage, IChatThread } from "./chat.interface";
import { ChatMessageRepository, ChatThreadRepository } from "./chat.repository";
import type {
  ChatMessageResponse,
  ChatThreadMessagesResponse,
  ChatThreadSummary,
  SendThreadMessagePayload,
} from "./chat.type";

export class ChatService {
  private threadRepo: ChatThreadRepository;
  private messageRepo: ChatMessageRepository;
  private userService: UserService;

  constructor() {
    this.threadRepo = new ChatThreadRepository();
    this.messageRepo = new ChatMessageRepository();
    this.userService = new UserService();
  }

  async ensureDirectThread(userId: string, otherUserId: string): Promise<ChatThreadSummary> {
    if (userId === otherUserId) {
      throw new BadRequestException("Cannot create direct thread with yourself");
    }

    const [user, other] = await Promise.all([
      User.findById(userId).select("_id blockedUsers").exec(),
      User.findById(otherUserId).select("_id blockedUsers").exec(),
    ]);

    if (!user || !other) {
      throw new NotFoundException("User not found");
    }

    if (this.isBlockedBetween(user as any, other as any, userId, otherUserId)) {
      throw new ForbiddenException("You cannot message this user");
    }

    let thread = await this.threadRepo.findDirectThreadBetween(userId, otherUserId);
    if (!thread) {
      thread = await this.threadRepo.create({
        type: "direct",
        memberUserIds: [userId, otherUserId] as any,
        directKey: this.threadRepo.buildDirectKey(userId, otherUserId),
      } as any);
    }

    return this.toThreadSummary(thread, null, userId);
  }

  async ensureHostThread(
    requesterUserId: string,
    payload: { targetId?: string; hostUserId?: string },
  ): Promise<ChatThreadSummary> {
    if (payload.hostUserId) {
      return this.ensureDirectThread(requesterUserId, payload.hostUserId);
    }

    if (!payload.targetId) {
      throw new BadRequestException("targetId or hostUserId is required");
    }

    const [activity, event] = await Promise.all([
      Activity.findById(payload.targetId).select("hostId").exec(),
      Event.findById(payload.targetId).select("creatorId").exec(),
    ]);

    if (activity?.hostId) {
      return this.ensureDirectThread(requesterUserId, activity.hostId.toString());
    }

    if (event?.creatorId) {
      return this.ensureDirectThread(requesterUserId, event.creatorId.toString());
    }

    throw new NotFoundException("Target activity/event not found");
  }

  async ensureAdminThread(requesterUserId: string): Promise<ChatThreadSummary> {
    const admin = await User.findOne({
      role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
      status: USER_STATUS.ACTIVE,
    })
      .sort({ role: 1, createdAt: 1 })
      .select("_id")
      .exec();

    if (!admin) throw new NotFoundException("No admin available");

    return this.ensureDirectThread(requesterUserId, admin._id.toString());
  }

  async sendMessageToThread(
    senderUserId: string,
    payload: SendThreadMessagePayload,
  ): Promise<{ thread: ChatThreadSummary; message: ChatMessageResponse }> {
    const thread = await this.threadRepo.findById(payload.threadId);
    if (!thread) throw new NotFoundException("Thread not found");

    if (!thread.memberUserIds.map(String).includes(senderUserId)) {
      throw new ForbiddenException("You are not a member of this thread");
    }

    this.validateMessagePayload(payload.type, payload.text, payload.imageUrl);

    const peerId = thread.memberUserIds.map(String).find((id) => id !== senderUserId) || null;
    if (peerId) {
      const [sender, peer] = await Promise.all([
        User.findById(senderUserId).select("blockedUsers").exec(),
        User.findById(peerId).select("blockedUsers").exec(),
      ]);
      if (sender && peer && this.isBlockedBetween(sender as any, peer as any, senderUserId, peerId)) {
        throw new ForbiddenException("You cannot message this user");
      }
    }

    const message = await this.messageRepo.create({
      threadId: thread._id,
      senderUserId,
      type: payload.type,
      text: payload.text?.trim() || null,
      imageUrl: payload.imageUrl?.trim() || null,
      seenByUserIds: [new Types.ObjectId(senderUserId)],
    } as any);

    await this.threadRepo.touch((thread._id as any).toString());

    return {
      thread: await this.toThreadSummary(thread, message, senderUserId),
      message: await this.toMessageResponse(message, senderUserId),
    };
  }

  async listThreadsForUser(userId: string): Promise<ChatThreadSummary[]> {
    const threads = await this.threadRepo.findThreadsForUser(userId);
    return Promise.all(threads.map((thread) => this.toThreadSummary(thread, null, userId)));
  }

  async listMessages(userId: string, threadId: string): Promise<ChatThreadMessagesResponse> {
    const thread = await this.threadRepo.findById(threadId);
    if (!thread) throw new NotFoundException("Thread not found");

    if (!thread.memberUserIds.map(String).includes(userId)) {
      throw new ForbiddenException("You are not part of this conversation");
    }

    const messages = await this.messageRepo.findByThread(threadId);
    const mapped = await Promise.all(messages.map((m) => this.toMessageResponse(m, userId)));

    return {
      threadId,
      messages: mapped,
    };
  }

  async markThreadSeen(userId: string, threadId: string) {
    const thread = await this.threadRepo.findById(threadId);
    if (!thread) throw new NotFoundException("Thread not found");

    if (!thread.memberUserIds.map(String).includes(userId)) {
      throw new ForbiddenException("You are not part of this conversation");
    }

    const markedCount = await this.messageRepo.markThreadSeen(threadId, userId);
    return { threadId, markedCount, seenAt: new Date() };
  }

  private validateMessagePayload(type: "text" | "image", text?: string, imageUrl?: string) {
    if (type === "text" && (!text || !text.trim())) {
      throw new BadRequestException("Text message requires non-empty text.");
    }
    if (type === "image" && (!imageUrl || !imageUrl.trim())) {
      throw new BadRequestException("Image message requires imageUrl.");
    }
  }

  private isBlockedBetween(
    user: { blockedUsers?: Types.ObjectId[] },
    other: { blockedUsers?: Types.ObjectId[] },
    userId: string,
    otherUserId: string,
  ) {
    return (
      (user.blockedUsers || []).some((id) => id.toString() === otherUserId)
      || (other.blockedUsers || []).some((id) => id.toString() === userId)
    );
  }

  private async toThreadSummary(
    thread: IChatThread,
    newMessage: IChatMessage | null,
    viewerUserId: string,
  ): Promise<ChatThreadSummary> {
    const threadId = (thread._id as any).toString();

    let lastMessage = newMessage;
    if (!lastMessage) {
      lastMessage = await this.messageRepo.findLastByThread(threadId);
    }

    const allMessages = await this.messageRepo.findByThread(threadId);
    const unreadCount = allMessages.filter((m) => {
      const isOwn = m.senderUserId.toString() === viewerUserId;
      const seen = (m.seenByUserIds || []).some((id) => id.toString() === viewerUserId);
      return !isOwn && !seen;
    }).length;

    const hasUnseenLastMessage = Boolean(
      lastMessage
      && lastMessage.senderUserId.toString() !== viewerUserId
      && !(lastMessage.seenByUserIds || []).some((id) => id.toString() === viewerUserId),
    );

    const peerId = thread.memberUserIds.map(String).find((id) => id !== viewerUserId) || null;
    let directPeer = null;
    if (peerId) {
      try {
        directPeer = await this.userService.getProfile(peerId);
      } catch {
        directPeer = null;
      }
    }

    return {
      _id: threadId,
      type: thread.type,
      memberUserIds: thread.memberUserIds.map((m) => m.toString()),
      memberCount: thread.memberUserIds.length,
      directPeer,
      lastMessage: lastMessage ? await this.toMessageResponse(lastMessage, viewerUserId) : null,
      unreadCount,
      hasUnseenLastMessage,
      updatedAt: thread.updatedAt,
      createdAt: thread.createdAt,
    };
  }

  private async toMessageResponse(
    message: IChatMessage,
    viewerUserId?: string,
  ): Promise<ChatMessageResponse> {
    const senderId = (message.senderUserId as any).toString();

    let sender = null;
    try {
      sender = await this.userService.getProfile(senderId);
    } catch {
      sender = null;
    }

    const seenByUserIds = (message.seenByUserIds || []).map((id) => id.toString());

    return {
      _id: (message._id as any).toString(),
      threadId: (message.threadId as any).toString(),
      senderUserId: senderId,
      type: message.type,
      text: message.text ?? null,
      imageUrl: message.imageUrl ?? null,
      seenByUserIds,
      isSeenByCurrentUser: viewerUserId ? seenByUserIds.includes(viewerUserId) : undefined,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender,
    };
  }
}
