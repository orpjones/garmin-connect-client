import { z } from 'zod';

export const MomentValueSchema = z.object({
  value: z.number().nullable(),
  startGMT: z.number(),
});

export type MomentValue = z.infer<typeof MomentValueSchema>;
