import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../src/app";

vi.mock("../src/modules/category/category.service", () => {
  class CategoryService {
    list = vi.fn().mockResolvedValue([
      { _id: "c1", name: "Fitness", isActive: true },
    ]);
  }

  return { CategoryService };
});

describe("Category routes", () => {
  it("lists categories", async () => {
    const res = await request(app)
      .get("/api/v1/categories")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });
});
