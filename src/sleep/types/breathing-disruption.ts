import { z } from 'zod';

import { BreathingDisruptionSeverity } from './breathing-disruption-severity';

export const BreathingDisruptionSchema = z.object({
  startGMT: z.string(),
  endGMT: z.string(),
  severity: z.nativeEnum(BreathingDisruptionSeverity),
});

export type BreathingDisruption = z.infer<typeof BreathingDisruptionSchema>;
