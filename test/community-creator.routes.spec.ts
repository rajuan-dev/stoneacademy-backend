import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../src/utils/app-error.utils";

const { createPostMock } = vi.hoisted(() => ({
  createPostMock: vi.fn(),
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

vi.mock("../src/modules/community-creator/community-creator.service", () => {
  class CommunityCreatorService {
    createPost = createPostMock;
  }

  return { CommunityCreatorService };
});

describe("Community creator routes", () => {
  const validMediaId = "6890e4caa12f9d001f1b0201";
  const otherMediaId = "6890e4caa12f9d001f1b0202";
  const missingMediaId = "6890e4caa12f9d001f1b0203";
  const validEventId = "6890e4caa12f9d001f1b0401";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .field("text", "Hello")
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it("creates a text-only post", async () => {
    createPostMock.mockResolvedValueOnce({ id: "post-1", text: "Hello", media: [] });

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("text", "Hello")
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("post-1");
  });

  it("supports image upload", async () => {
    createPostMock.mockResolvedValueOnce({ id: "post-1", media: [{ type: "IMAGE", order: 0 }] });

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .attach("media", Buffer.from("image"), "photo.jpg")
      .expect(201);

    expect(res.body.data.media[0].type).toBe("IMAGE");
  });

  it("supports video upload", async () => {
    createPostMock.mockResolvedValueOnce({ id: "post-1", media: [{ type: "VIDEO", order: 0 }] });

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .attach("media", Buffer.from("video"), "clip.mp4")
      .expect(201);

    expect(res.body.data.media[0].type).toBe("VIDEO");
  });

  it("supports existing media ids", async () => {
    createPostMock.mockResolvedValueOnce({ id: "post-1", media: [{ id: "m1", order: 0 }] });

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("mediaIds", JSON.stringify([validMediaId]))
      .expect(201);

    expect(createPostMock).toHaveBeenCalled();
    expect(res.body.data.id).toBe("post-1");
  });

  it("rejects invalid location with 400", async () => {
    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("location[label]", "Park")
      .field("location[latitude]", "north")
      .field("location[longitude]", "4.56")
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });

  it("rejects invalid object ids with validation errors", async () => {
    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("mediaIds", JSON.stringify(["bad-id"]))
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });

  it("preserves ordered existing and uploaded media in the response", async () => {
    createPostMock.mockResolvedValueOnce({
      id: "post-1",
      media: [
        { id: "m1", order: 0 },
        { id: "m2", order: 1 },
      ],
    });

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("mediaIds", JSON.stringify([validMediaId]))
      .attach("media", Buffer.from("image"), "photo.jpg")
      .expect(201);

    expect(res.body.data.media[0].order).toBe(0);
    expect(res.body.data.media[1].order).toBe(1);
  });

  it("supports location posts", async () => {
    createPostMock.mockResolvedValueOnce({ id: "post-1", location: { label: "Park" } });

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("location[label]", "Park")
      .field("location[latitude]", "1.23")
      .field("location[longitude]", "4.56")
      .expect(201);

    expect(res.body.data.location.label).toBe("Park");
  });

  it("supports event posts", async () => {
    createPostMock.mockResolvedValueOnce({ id: "post-1", event: { id: "event-1" } });

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("eventId", validEventId)
      .expect(201);

    expect(res.body.data.event.id).toBe("event-1");
  });

  it("supports link posts", async () => {
    createPostMock.mockResolvedValueOnce({ id: "post-1", link: "https://example.com" });

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("link", "https://example.com")
      .expect(201);

    expect(res.body.data.link).toBe("https://example.com");
  });

  it("rejects empty posts", async () => {
    createPostMock.mockRejectedValueOnce(
      new BadRequestException("Community post must include at least one content field"),
    );

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .expect(400);

    expect(res.body.message).toBe("Community post must include at least one content field");
  });

  it("rejects unsupported files", async () => {
    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .attach("media", Buffer.from("file"), "notes.txt")
      .expect(400);

    expect(res.body.message).toBe("Only image and video uploads are supported");
  });

  it("rejects excessive media files before service execution", async () => {
    const req = request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token");

    for (let i = 0; i < 11; i += 1) {
      req.attach("media", Buffer.from(`image-${i}`), `photo-${i}.jpg`);
    }

    const res = await req.expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("maximum of 10 files");
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("rejects media ownership mismatches", async () => {
    createPostMock.mockRejectedValueOnce(
      new ForbiddenException("You do not have access to this media"),
    );

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("mediaIds", JSON.stringify([otherMediaId]))
      .expect(403);

    expect(res.body.message).toBe("You do not have access to this media");
  });

  it("rejects missing media", async () => {
    createPostMock.mockRejectedValueOnce(new NotFoundException("Media not found"));

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("mediaIds", JSON.stringify([missingMediaId]))
      .expect(404);

    expect(res.body.message).toBe("Media not found");
  });

  it("returns the canonical post response", async () => {
    createPostMock.mockResolvedValueOnce({
      id: "post-1",
      author: {
        id: "user-1",
        name: "Test User",
        username: "test",
        avatarUrl: null,
      },
      text: "Hello",
      media: [],
      location: null,
      event: null,
      link: null,
      likeCount: 0,
      commentCount: 0,
      isLikedByCurrentUser: false,
      createdAt: new Date().toISOString(),
    });

    const res = await request(app)
      .post("/api/v1/community-creator/posts")
      .set("Authorization", "Bearer valid-token")
      .field("text", "Hello")
      .expect(201);

    expect(res.body.data).toHaveProperty("author");
    expect(res.body.data).toHaveProperty("isLikedByCurrentUser", false);
  });
});
