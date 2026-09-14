import { vi } from "vitest";

vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("BASE_URL", "/api/v1");
vi.stubEnv("JWT_SECRET", "test-jwt-secret");
vi.stubEnv("JWT_REFRESH_SECRET", "test-jwt-refresh-secret");

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
