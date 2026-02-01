import { z } from 'zod';

export const TimespanActivityLevelSchema = z.object({
  startGMT: z.string(),
  endGMT: z.string(),
  activityLevel: z.number(),
});

export type TimespanActivityLevel = z.infer<typeof TimespanActivityLevelSchema>;
