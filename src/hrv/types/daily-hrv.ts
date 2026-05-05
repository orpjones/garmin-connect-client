import { z } from 'zod';

import { HrvReadingSchema } from './hrv-reading';
import { HrvSummarySchema } from './hrv-summary';

export const DailyHrvSchema = z.object({
  userProfilePk: z.number(),
  hrvSummary: HrvSummarySchema,
  hrvReadings: z.array(HrvReadingSchema),
  startTimestampGMT: z.string(), // ISO 8601 format
  endTimestampGMT: z.string(), // ISO 8601 format
  startTimestampLocal: z.string(), // ISO 8601 format
  endTimestampLocal: z.string(), // ISO 8601 format
  sleepStartTimestampGMT: z.string().nullable(), // ISO 8601 format
  sleepEndTimestampGMT: z.string().nullable(), // ISO 8601 format
  sleepStartTimestampLocal: z.string().nullable(), // ISO 8601 format
  sleepEndTimestampLocal: z.string().nullable(), // ISO 8601 format
});

export type DailyHrv = z.infer<typeof DailyHrvSchema>;
