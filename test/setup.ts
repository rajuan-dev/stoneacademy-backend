import { vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.BASE_URL = "/api/v1";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret";

vi.mock("../src/services/s3.service", () => {
  return {
    s3Service: {
      uploadFile: vi.fn().mockResolvedValue({
        key: "mock-key",
        url: "https://example.com/mock",
      }),
      uploadFiles: vi.fn().mockResolvedValue([
        { key: "mock-key", url: "https://example.com/mock" },
      ]),
    },
  };
});
