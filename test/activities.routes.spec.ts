import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../src/app";

vi.mock("../src/modules/activity/activity.service", () => {
  class ActivityService {
    list = vi.fn().mockResolvedValue({
      data: [{ _id: "a1", title: "Morning Run" }],
      pagination: { currentPage: 1, itemsPerPage: 10, totalItems: 1 },
    });
    getById = vi.fn().mockResolvedValue({ _id: "a1", title: "Morning Run" });
  }

  return { ActivityService };
});

describe("Activity routes", () => {
  it("lists activities", async () => {
    const res = await request(app)
      .get("/api/v1/activities")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it("gets activity by id", async () => {
    const res = await request(app)
      .get("/api/v1/activities/a1")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe("a1");
  });
});
