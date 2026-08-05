import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import {
  BadRequestException,
  NotFoundException,
} from "../src/utils/app-error.utils";

const {
  listPostsMock,
  getPostByIdMock,
  togglePostLikeMock,
  updatePostMock,
  deletePostMock,
  reportPostMock,
  listCommentsMock,
  createCommentMock,
  listRepliesMock,
  createReplyMock,
} = vi.hoisted(() => ({
  listPostsMock: vi.fn(),
  getPostByIdMock: vi.fn(),
  togglePostLikeMock: vi.fn(),
  updatePostMock: vi.fn(),
  deletePostMock: vi.fn(),
  reportPostMock: vi.fn(),
  listCommentsMock: vi.fn(),
  createCommentMock: vi.fn(),
  listRepliesMock: vi.fn(),
  createReplyMock: vi.fn(),
}));

vi.mock("../src/modules/auth/auth.utils", () => ({
  AuthUtil: {
    verifyAccessToken: vi.fn((token: string) => {
      if (token === "valid-token") {
        return {
          userId: "user-1",
          email: "test@example.com",
          role: "user",
          status: "active",
        };
      }
      throw new Error("invalid token");
    }),
  },
}));

vi.mock("../src/modules/community/community.service", () => {
  class CommunityService {
    listPosts = listPostsMock;
    getPostById = getPostByIdMock;
    togglePostLike = togglePostLikeMock;
    updatePost = updatePostMock;
    deletePost = deletePostMock;
    reportPost = reportPostMock;
    listComments = listCommentsMock;
    createComment = createCommentMock;
    listReplies = listRepliesMock;
    createReply = createReplyMock;
  }

  return { CommunityService };
});

describe("Community routes", () => {
  const validPostId = "6890e4caa12f9d001f1b0001";
  const validCommentId = "6890e4caa12f9d001f1b0301";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/community/posts").expect(401);

    expect(res.body.success).toBe(false);
  });

  it("returns the community feed", async () => {
    listPostsMock.mockResolvedValueOnce({
      data: [{ id: "post-1" }],
      pagination: { currentPage: 2, itemsPerPage: 5, totalItems: 11, pageCount: 3 },
    });

    const res = await request(app)
      .get("/api/v1/community/posts?q=hello&page=2&limit=5")
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(listPostsMock).toHaveBeenCalledWith({
      q: "hello",
      page: 2,
      limit: 5,
      currentUserId: "user-1",
    });
    expect(res.body.success).toBe(true);
    expect(res.body.meta.page).toBe(2);
  });

  it("returns post detail", async () => {
    getPostByIdMock.mockResolvedValueOnce({ id: "post-1" });

    const res = await request(app)
      .get(`/api/v1/community/posts/${validPostId}`)
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(res.body.data.id).toBe("post-1");
  });

  it("rejects invalid post ids at validation time", async () => {
    const res = await request(app)
      .get("/api/v1/community/posts/not-an-object-id")
      .set("Authorization", "Bearer valid-token")
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });

  it("returns repository error shape for missing detail", async () => {
    getPostByIdMock.mockRejectedValueOnce(new NotFoundException("Community post not found"));

    const res = await request(app)
      .get("/api/v1/community/posts/6890e4caa12f9d001f1b0999")
      .set("Authorization", "Bearer valid-token")
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Community post not found");
  });

  it("toggles an unliked post to liked", async () => {
    togglePostLikeMock.mockResolvedValueOnce({
      postId: "post-1",
      likeCount: 10,
      isLikedByCurrentUser: true,
    });

    const res = await request(app)
      .post(`/api/v1/community/posts/${validPostId}/like`)
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(togglePostLikeMock).toHaveBeenCalledWith(validPostId, "user-1");
    expect(res.body.data.isLikedByCurrentUser).toBe(true);
  });

  it("toggles a liked post to unliked", async () => {
    togglePostLikeMock.mockResolvedValueOnce({
      postId: "post-1",
      likeCount: 9,
      isLikedByCurrentUser: false,
    });

    const res = await request(app)
      .post(`/api/v1/community/posts/${validPostId}/like`)
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(res.body.data.isLikedByCurrentUser).toBe(false);
    expect(res.body.message).toBe("Community post unliked successfully");
  });

  it("does not expose the removed unlike route", async () => {
    await request(app)
      .delete(`/api/v1/community/posts/${validPostId}/like`)
      .set("Authorization", "Bearer valid-token")
      .expect(404);
  });

  it("updates a post", async () => {
    updatePostMock.mockResolvedValueOnce({ id: "post-1", text: "Updated" });

    const res = await request(app)
      .patch(`/api/v1/community/posts/${validPostId}`)
      .set("Authorization", "Bearer valid-token")
      .send({ text: "Updated" })
      .expect(200);

    expect(updatePostMock).toHaveBeenCalledWith(expect.objectContaining({
      postId: validPostId,
      userId: "user-1",
      text: "Updated",
    }));
    expect(res.body.data.text).toBe("Updated");
  });

  it("deletes a post", async () => {
    deletePostMock.mockResolvedValueOnce(undefined);

    await request(app)
      .delete(`/api/v1/community/posts/${validPostId}`)
      .set("Authorization", "Bearer valid-token")
      .expect(204);

    expect(deletePostMock).toHaveBeenCalledWith(validPostId, "user-1");
  });

  it("reports a post", async () => {
    reportPostMock.mockResolvedValueOnce({ id: "report-1", entityType: "community_post" });

    const res = await request(app)
      .post(`/api/v1/community/posts/${validPostId}/report`)
      .set("Authorization", "Bearer valid-token")
      .send({ reason: "spam", details: "Repeated promo" })
      .expect(201);

    expect(reportPostMock).toHaveBeenCalledWith(
      validPostId,
      "user-1",
      { reason: "spam", details: "Repeated promo" },
    );
    expect(res.body.data.entityType).toBe("community_post");
  });

  it("lists comments with paginated envelope", async () => {
    listCommentsMock.mockResolvedValueOnce({
      data: [{ id: "comment-1" }],
      pagination: { currentPage: 1, itemsPerPage: 10, totalItems: 1, pageCount: 1 },
    });

    const res = await request(app)
      .get(`/api/v1/community/posts/${validPostId}/comments?page=1&limit=10`)
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(res.body.meta.totalItems).toBe(1);
    expect(res.body.data[0].id).toBe("comment-1");
  });

  it("creates a comment", async () => {
    createCommentMock.mockResolvedValueOnce({ id: "comment-1", text: "Hello" });

    const res = await request(app)
      .post(`/api/v1/community/posts/${validPostId}/comments`)
      .set("Authorization", "Bearer valid-token")
      .send({ text: "Hello", eventId: "6890e4caa12f9d001f1b0401" })
      .expect(201);

    expect(createCommentMock).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "6890e4caa12f9d001f1b0401",
    }));
    expect(res.body.data.id).toBe("comment-1");
  });

  it("rejects unauthenticated writes", async () => {
    const res = await request(app)
      .post(`/api/v1/community/posts/${validPostId}/comments`)
      .send({ text: "Hello" })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it("lists replies with paginated envelope", async () => {
    listRepliesMock.mockResolvedValueOnce({
      data: [{ id: "reply-1" }],
      pagination: { currentPage: 1, itemsPerPage: 10, totalItems: 1, pageCount: 1 },
    });

    const res = await request(app)
      .get(`/api/v1/community/comments/${validCommentId}/replies`)
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(res.body.meta.totalItems).toBe(1);
  });

  it("creates a reply", async () => {
    createReplyMock.mockResolvedValueOnce({ id: "reply-1", text: "Reply" });

    const res = await request(app)
      .post(`/api/v1/community/comments/${validCommentId}/replies`)
      .set("Authorization", "Bearer valid-token")
      .send({ activityId: "6890e4caa12f9d001f1b0501" })
      .expect(201);

    expect(createReplyMock).toHaveBeenCalledWith(expect.objectContaining({
      activityId: "6890e4caa12f9d001f1b0501",
    }));
    expect(res.body.data.id).toBe("reply-1");
  });

  it("returns api response envelope on validation failure", async () => {
    const res = await request(app)
      .post(`/api/v1/community/comments/${validCommentId}/replies`)
      .set("Authorization", "Bearer valid-token")
      .send({ text: "   " })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });

  it("surfaces service bad requests", async () => {
    createReplyMock.mockRejectedValueOnce(new BadRequestException("Replying to a reply is not supported"));

    const res = await request(app)
      .post(`/api/v1/community/comments/${validCommentId}/replies`)
      .set("Authorization", "Bearer valid-token")
      .send({ text: "Reply" })
      .expect(400);

    expect(res.body.message).toBe("Replying to a reply is not supported");
  });
});
