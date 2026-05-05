import { z } from 'zod';

import { HrvStatus } from './hrv-status';
import { HrvSummaryFeedbackPhrase } from './hrv-summary-feedback-phrase';

export const HrvSummarySchema = z.object({
  calendarDate: z.string(), // ISO 8601 format
  weeklyAvg: z.number().nullable(),
  lastNightAvg: z.number().nullable(),
  lastNight5MinHigh: z.number().nullable(),
  baseline: z
    .object({
      lowUpper: z.number(),
      balancedLow: z.number(),
      balancedUpper: z.number(),
      markerValue: z.number(),
    })
    .nullable(),
  status: z.nativeEnum(HrvStatus),
  feedbackPhrase: z.nativeEnum(HrvSummaryFeedbackPhrase),
  createTimeStamp: z.string(), // ISO 8601 format
});
