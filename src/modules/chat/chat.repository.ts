import { BaseRepository } from "@/modules/base/base.repository";
import { Types } from "mongoose";
import type { IChatMessage, IChatThread } from "./chat.interface";
import { ChatMessage, ChatThread } from "./chat.model";

export class ChatThreadRepository extends BaseRepository<IChatThread> {
  constructor() {
    super(ChatThread);
  }

  async findDirectThreadBetween(
    userA: string,
    userB: string,
  ): Promise<IChatThread | null> {
    const directKey = this.buildDirectKey(userA, userB);
    return this.model.findOne({ type: "direct", directKey }).exec();
  }

  buildDirectKey(userA: string, userB: string) {
    return [userA, userB].sort().join("|");
  }

  async findThreadsForUser(userId: string): Promise<IChatThread[]> {
    return this.model
      .find({ memberUserIds: userId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async touch(threadId: string): Promise<void> {
    await this.model
      .findByIdAndUpdate(threadId, { updatedAt: new Date() })
      .lean()
      .exec();
  }
}

export class ChatMessageRepository extends BaseRepository<IChatMessage> {
  constructor() {
    super(ChatMessage);
  }

  async findByThread(threadId: string): Promise<IChatMessage[]> {
    return this.model.find({ threadId }).sort({ createdAt: 1 }).exec();
  }

  async findLastByThread(threadId: string): Promise<IChatMessage | null> {
    return this.model.findOne({ threadId }).sort({ createdAt: -1 }).exec();
  }

  async markThreadSeen(threadId: string, userId: string): Promise<number> {
    const objectId = new Types.ObjectId(userId);
    const result = await this.model.updateMany(
      {
        threadId,
        senderUserId: { $ne: objectId },
        seenByUserIds: { $nin: [objectId] },
      },
      { $addToSet: { seenByUserIds: objectId } },
    ).exec();

    return result.modifiedCount || 0;
  }

  async markMessageSeen(
    messageId: string,
    userId: import("mongoose").Types.ObjectId,
  ): Promise<IChatMessage | null> {
    return this.model
      .findByIdAndUpdate(
        messageId,
        { $addToSet: { seenByUserIds: userId } },
        { new: true },
      )
      .exec();
  }
}
