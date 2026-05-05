import { z } from 'zod';

import { HrvReadingSchema } from './hrv-reading';
import { HrvSummarySchema } from './hrv-summary';

export const DailyHrvSchema = z.object({
  userProfilePk: z.number(),
  hrvSummary: HrvSummarySchema,
  hrvReadings: z.array(HrvReadingSchema),
  startTimestampGMT: z.string(),
  endTimestampGMT: z.string(),
  startTimestampLocal: z.string(),
  endTimestampLocal: z.string(),
  sleepStartTimestampGMT: z.string().nullable(),
  sleepEndTimestampGMT: z.string().nullable(),
  sleepStartTimestampLocal: z.string().nullable(),
  sleepEndTimestampLocal: z.string().nullable(),
});

export type DailyHrv = z.infer<typeof DailyHrvSchema>;
