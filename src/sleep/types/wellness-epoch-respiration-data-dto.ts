import { z } from 'zod';

export const WellnessEpochRespirationDataDTOSchema = z.object({
  startTimeGMT: z.number(),
  respirationValue: z.number(),
});

export type WellnessEpochRespirationDataDTO = z.infer<typeof WellnessEpochRespirationDataDTOSchema>;
