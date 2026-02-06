import { vi } from "vitest";

process.env.BASE_URL = "/api/v1";

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
