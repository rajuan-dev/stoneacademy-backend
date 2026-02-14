import { describe, expect, it } from "vitest";
import { createEventSchema } from "../src/modules/event/event.schema";

describe("Event schema", () => {
  const baseBody = {
    title: "City Walk",
    type: "walking",
    description: "Community walk",
    startAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    location: {
      label: "Central Park",
      coordinates: [-73.97, 40.77],
    },
    participantLimit: 25,
    durationMinutes: 90,
  };

  it("allows free events with zero ticket price", () => {
    const result = createEventSchema.safeParse({
      body: {
        ...baseBody,
        priceType: "free",
        ticketPrice: 0,
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects paid events without positive ticket price", () => {
    const result = createEventSchema.safeParse({
      body: {
        ...baseBody,
        priceType: "paid",
        ticketPrice: 0,
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects discount over 100", () => {
    const result = createEventSchema.safeParse({
      body: {
        ...baseBody,
        priceType: "paid",
        ticketPrice: 20,
        discountPercentage: 110,
      },
    });

    expect(result.success).toBe(false);
  });
});
