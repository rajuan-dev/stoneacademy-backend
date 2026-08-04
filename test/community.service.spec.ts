import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundException } from "../src/utils/app-error.utils";

const {
  communityPostModel,
  communityCommentModel,
  transactionHelperMock,
  eventServiceGetByIdMock,
} = vi.hoisted(() => ({
  communityPostModel: {
    findById: vi.fn(),
    updateOne: vi.fn(),
  },
  communityCommentModel: {
    create: vi.fn(),
    findById: vi.fn(),
    updateOne: vi.fn(),
  },
  transactionHelperMock: {
    withTransaction: vi.fn(),
  },
  eventServiceGetByIdMock: vi.fn(),
}));

vi.mock("../src/modules/community/community-post.model", () => ({
  CommunityPost: communityPostModel,
}));

vi.mock("../src/modules/community/community-comment.model", () => ({
  CommunityComment: communityCommentModel,
}));

vi.mock("../src/modules/community/community-like.model", () => ({
  CommunityLike: {},
}));

vi.mock("../src/modules/event/event.service", () => ({
  EventService: class {
    getById = eventServiceGetByIdMock;
  },
}));

vi.mock("../src/utils/transaction.utils", () => ({
  TransactionHelper: transactionHelperMock,
}));

import { CommunityService } from "../src/modules/community/community.service";

describe("CommunityService counter consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionHelperMock.withTransaction.mockImplementation(async (callback: (session: unknown) => Promise<unknown>) =>
      callback({}),
    );
  });

  it("does not increment commentCount when comment creation fails", async () => {
    const postExec = vi.fn().mockResolvedValue({
      authorId: { toString: () => "author-1" },
    });
    const sessionSpy = vi.fn().mockReturnValue({ exec: postExec });
    const selectSpy = vi.fn().mockReturnValue({ session: sessionSpy });
    communityPostModel.findById.mockReturnValue({ select: selectSpy });
    communityCommentModel.create.mockRejectedValueOnce(new Error("create failed"));

    const service = new CommunityService();

    await expect(service.createComment({
      postId: "6890e4caa12f9d001f1b0001",
      authorId: "6890e4caa12f9d001f1b0101",
      text: "Hello",
    })).rejects.toThrow("create failed");

    expect(communityPostModel.updateOne).not.toHaveBeenCalled();
  });

  it("does not increment counters when reply creation fails", async () => {
    const parentExec = vi.fn().mockResolvedValue({
      postId: "6890e4caa12f9d001f1b0001",
      parentCommentId: null,
    });
    const parentSession = vi.fn().mockReturnValue({ exec: parentExec });
    const parentSelect = vi.fn().mockReturnValue({ session: parentSession });

    const postExec = vi.fn().mockResolvedValue({
      authorId: { toString: () => "author-1" },
    });
    const postSession = vi.fn().mockReturnValue({ exec: postExec });
    const postSelect = vi.fn().mockReturnValue({ session: postSession });

    communityCommentModel.findById.mockReturnValue({ select: parentSelect });
    communityPostModel.findById.mockReturnValue({ select: postSelect });
    communityCommentModel.create.mockRejectedValueOnce(new Error("reply create failed"));

    const service = new CommunityService();

    await expect(service.createReply({
      commentId: "6890e4caa12f9d001f1b0301",
      authorId: "6890e4caa12f9d001f1b0101",
      text: "Reply",
    })).rejects.toThrow("reply create failed");

    expect(communityCommentModel.updateOne).not.toHaveBeenCalled();
    expect(communityPostModel.updateOne).not.toHaveBeenCalled();
  });

  it("throws not found before comment creation when post is missing", async () => {
    const postExec = vi.fn().mockResolvedValue(null);
    const sessionSpy = vi.fn().mockReturnValue({ exec: postExec });
    const selectSpy = vi.fn().mockReturnValue({ session: sessionSpy });
    communityPostModel.findById.mockReturnValue({ select: selectSpy });

    const service = new CommunityService();

    await expect(service.createComment({
      postId: "6890e4caa12f9d001f1b0001",
      authorId: "6890e4caa12f9d001f1b0101",
      text: "Hello",
    })).rejects.toBeInstanceOf(NotFoundException);

    expect(communityCommentModel.create).not.toHaveBeenCalled();
  });
});
