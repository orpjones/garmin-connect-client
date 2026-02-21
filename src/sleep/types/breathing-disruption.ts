import { z } from 'zod';

import { BreathingDisruptionSeverity } from './breathing-disruption-severity';

export const BreathingDisruptionSchema = z.object({
  startGMT: z.string(), // ISO 8601 format
  endGMT: z.string(), // ISO 8601 format
  severity: z.nativeEnum(BreathingDisruptionSeverity),
});

export type BreathingDisruption = z.infer<typeof BreathingDisruptionSchema>;
