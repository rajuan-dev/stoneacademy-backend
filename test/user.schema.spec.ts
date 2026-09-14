import { describe, expect, it } from "vitest";

import { updateProfileSchema } from "../src/modules/user/user.schema";

describe("User profile schema", () => {
  it("allows updating country through the existing profile update payload", async () => {
    const parsed = await updateProfileSchema.parseAsync({
      body: {
        country: "Bangladesh",
      },
    });

    expect(parsed.body.country).toBe("Bangladesh");
  });

  it("does not require country when updating another profile field", async () => {
    const parsed = await updateProfileSchema.parseAsync({
      body: {
        fullName: "Updated User",
      },
    });

    expect(parsed.body.country).toBeUndefined();
    expect(parsed.body.fullName).toBe("Updated User");
  });
});
