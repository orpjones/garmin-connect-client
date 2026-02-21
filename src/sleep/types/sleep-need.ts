import { z } from 'zod';

import { Feedback } from './feedback';
import { HrvAdjustment } from './hrv-adjustment';
import { NapAdjustment } from './nap-adjustment';
import { SleepHistoryAdjustment } from './sleep-history-adjustment';
import { TrainingFeedback } from './training-feedback';

export const SleepNeedSchema = z.object({
  userProfilePk: z.number(),
  calendarDate: z.string(), // ISO 8601 format
  deviceId: z.number(),
  timestampGmt: z.string(), // ISO 8601 format
  baseline: z.number(),
  actual: z.number(),
  feedback: z.nativeEnum(Feedback),
  trainingFeedback: z.nativeEnum(TrainingFeedback),
  sleepHistoryAdjustment: z.nativeEnum(SleepHistoryAdjustment),
  hrvAdjustment: z.nativeEnum(HrvAdjustment),
  napAdjustment: z.nativeEnum(NapAdjustment),
  displayedForTheDay: z.boolean(),
  preferredActivityTracker: z.boolean(),
});

export type SleepNeed = z.infer<typeof SleepNeedSchema>;
