import { z } from 'zod';

export const TimespanActivityLevelSchema = z.object({
  startGMT: z.string(), // ISO 8601 format
  endGMT: z.string(), // ISO 8601 format
  activityLevel: z.number(),
});

export type TimespanActivityLevel = z.infer<typeof TimespanActivityLevelSchema>;
