import { z } from "zod";

export const onboardingStatusSchema = z.object({
  params: z.object({}).optional(),
});
