import { z } from 'zod';

import { SleepStatsIndividualSchema } from './sleep-stats-individual';

export const SleepStatsSchema = z.object({
  overallStats: z
    .object({
      averageSpO2: z.number().nullable(),
      meanAvgHeartRate: z.number().nullable(),
      averageLocalSleepStartTime: z.number(),
      averageRespiration: z.number().nullable(),
      averageBodyBatteryChange: z.number().nullable(),
      averageSkinTempF: z.number().nullable(),
      averageSleepScore: z.number().nullable(),
      averageLocalSleepEndTime: z.number(),
      averageSkinTempC: z.number().nullable(),
      averageSleepSeconds: z.number(),
      averageSleepNeed: z.number().nullable(),
      averageRestingHeartRate: z.number().nullable(),
    })
    .nullable(),
  individualStats: z.array(SleepStatsIndividualSchema).nullable(),
});

export type SleepStats = z.infer<typeof SleepStatsSchema>;
