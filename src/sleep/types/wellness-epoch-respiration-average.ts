import { z } from 'zod';

export const WellnessEpochRespirationAverageSchema = z.object({
  epochEndTimestampGmt: z.number(),
  respirationAverageValue: z.number(),
  respirationHighValue: z.number().nullable(),
  respirationLowValue: z.number().nullable(),
});

export type WellnessEpochRespirationAverage = z.infer<typeof WellnessEpochRespirationAverageSchema>;
