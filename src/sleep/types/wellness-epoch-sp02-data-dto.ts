import { z } from 'zod';

export const WellnessEpochSPO2DataDTOSchema = z.object({
  userProfilePK: z.number(),
  epochTimestamp: z.string(),
  deviceId: z.number(),
  calendarDate: z.string(), // ISO 8601 format
  epochDuration: z.number(),
  spo2Reading: z.number().nullable(),
  readingConfidence: z.number(),
});

export type WellnessEpochSPO2DataDTO = z.infer<typeof WellnessEpochSPO2DataDTOSchema>;
