import { z } from 'zod';

import { HrvStatus } from './hrv-status';

const HrvSummarySchema = z.object({
  calendarDate: z.string(),
  weeklyAvg: z.number(),
  lastNightAvg: z.number(),
  lastNight5MinHigh: z.number(),
  baseline: z.object({
    lowUpper: z.number(),
    balancedLow: z.number(),
    balancedUpper: z.number(),
    markerValue: z.number(),
  }),
  status: z.nativeEnum(HrvStatus),
  feedbackPhrase: z.string(),
  createTimeStamp: z.string(),
});

const HrvReadingSchema = z.object({
  hrvValue: z.number(),
  readingTimeGMT: z.string(),
  readingTimeLocal: z.string(),
});

export const DailyHrvSchema = z.object({
  userProfilePk: z.number(),
  hrvSummary: HrvSummarySchema,
  hrvReadings: z.array(HrvReadingSchema),
  startTimestampGMT: z.string(),
  endTimestampGMT: z.string(),
  startTimestampLocal: z.string(),
  endTimestampLocal: z.string(),
  sleepStartTimestampGMT: z.string(),
  sleepEndTimestampGMT: z.string(),
  sleppStartTimestampLocal: z.string(),
  sleepEndTimestampLocal: z.string(),
});

export type DailyHrv = z.infer<typeof DailyHrvSchema>;
