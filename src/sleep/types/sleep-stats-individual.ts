import { z } from 'zod';

import { HrvStatus } from '../../types';

import { SleepScoreQuality } from './sleep-score-quality';

export const SleepStatsIndividualSchema = z.object({
  calendarDate: z.string(), // ISO 8601 format
  values: z.object({
    remTime: z.number().nullable(),
    restingHeartRate: z.number().nullable(),
    totalSleepTimeInSeconds: z.number(),
    respiration: z.number().nullable(),
    localSleepEndTimeInMillis: z.number(),
    deepTime: z.number().nullable(),
    awakeTime: z.number().nullable(),
    sleepScoreQuality: z.nativeEnum(SleepScoreQuality).nullable(),
    spO2: z.number().nullable(),
    localSleepStartTimeInMillis: z.number(),
    sleepNeed: z.number().nullable(),
    bodyBatteryChange: z.number().nullable(),
    gmtSleepStartTimeInMillis: z.number(),
    gmtSleepEndTimeInMillis: z.number(),
    hrvStatus: z.nativeEnum(HrvStatus).nullable(),
    skinTempF: z.number().nullable(),
    sleepScore: z.number().nullable(),
    skinTempC: z.number().nullable(),
    lightTime: z.number().nullable(),
    avgOvernightHrv: z.number().nullable(),
    avgHeartRate: z.number().nullable(),
    hrv7dAverage: z.number().nullable(),
  }),
});

export type SleepStatsIndividual = z.infer<typeof SleepStatsIndividualSchema>;
