import { z } from 'zod';

export const HrvReadingSchema = z.object({
  hrvValue: z.number(),
  readingTimeGMT: z.string(),
  readingTimeLocal: z.string(),
});
