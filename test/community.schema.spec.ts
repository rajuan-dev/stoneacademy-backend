import { describe, expect, it } from "vitest";
import {
  createCommunityCommentSchema,
  createCommunityReplySchema,
  listCommunityPostsSchema,
} from "../src/modules/community/community.schema";
import { createCommunityPostSchema } from "../src/modules/community-creator/community-creator.schema";

describe("Community schemas", () => {
  const validPostId = "6890e4caa12f9d001f1b0001";
  const validCommentId = "6890e4caa12f9d001f1b0301";

  it("accepts a valid list query", () => {
    const result = listCommunityPostsSchema.safeParse({
      query: { q: "stone", page: "2", limit: "5" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query.page).toBe(2);
      expect(result.data.query.limit).toBe(5);
    }
  });

  it("rejects invalid page and limit", () => {
    const result = listCommunityPostsSchema.safeParse({
      query: { page: "0", limit: "101" },
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid comment text", () => {
    expect(createCommunityCommentSchema.safeParse({
      params: { postId: validPostId },
      body: { text: "Hello world" },
    }).success).toBe(true);
  });

  it("rejects blank comments", () => {
    expect(createCommunityCommentSchema.safeParse({
      params: { postId: validPostId },
      body: { text: "   " },
    }).success).toBe(false);
  });

  it("rejects overlong comments", () => {
    expect(createCommunityCommentSchema.safeParse({
      params: { postId: validPostId },
      body: { text: "a".repeat(4001) },
    }).success).toBe(false);
  });

  it("accepts valid reply text", () => {
    expect(createCommunityReplySchema.safeParse({
      params: { commentId: validCommentId },
      body: { text: "Reply" },
    }).success).toBe(true);
  });

  it("accepts valid creator text", () => {
    expect(createCommunityPostSchema.safeParse({
      body: { text: "Community update" },
    }).success).toBe(true);
  });

  it("accepts valid media ids", () => {
    const result = createCommunityPostSchema.safeParse({
      body: {
        mediaIds: [
          "6890e4caa12f9d001f1b0201",
          "6890e4caa12f9d001f1b0202",
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts valid location", () => {
    const result = createCommunityPostSchema.safeParse({
      body: {
        location: {
          label: "Dhaka",
          latitude: 23.8103,
          longitude: 90.4125,
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts valid event id", () => {
    expect(createCommunityPostSchema.safeParse({
      body: { eventId: "6890e4caa12f9d001f1b0401" },
    }).success).toBe(true);
  });

  it("accepts a valid url", () => {
    expect(createCommunityPostSchema.safeParse({
      body: { link: "https://example.com/resource" },
    }).success).toBe(true);
  });

  it("rejects malformed url", () => {
    expect(createCommunityPostSchema.safeParse({
      body: { link: "not-a-url" },
    }).success).toBe(false);
  });

  it("parses multipart-style fields", () => {
    const result = createCommunityPostSchema.safeParse({
      body: {
        mediaIds: "[\"6890e4caa12f9d001f1b0201\",\"6890e4caa12f9d001f1b0202\"]",
        location: "{\"label\":\"Park\",\"latitude\":1.2,\"longitude\":3.4}",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.mediaIds).toEqual([
        "6890e4caa12f9d001f1b0201",
        "6890e4caa12f9d001f1b0202",
      ]);
      expect(result.data.body.location?.coordinates).toEqual([3.4, 1.2]);
    }
  });

  it("rejects invalid location input", () => {
    expect(createCommunityPostSchema.safeParse({
      body: {
        location: {
          label: "Bad",
          latitude: "north",
          longitude: 3.4,
        },
      },
    }).success).toBe(false);
  });

  it("rejects invalid object ids", () => {
    expect(createCommunityPostSchema.safeParse({
      body: {
        mediaIds: ["bad-id"],
        eventId: "bad-id",
      },
    }).success).toBe(false);
  });
});
