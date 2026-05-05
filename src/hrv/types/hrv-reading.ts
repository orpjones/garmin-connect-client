import { z } from 'zod';

export const HrvReadingSchema = z.object({
  hrvValue: z.number(),
  readingTimeGMT: z.string(), // ISO 8601 format
  readingTimeLocal: z.string(), // ISO 8601 format
});
