import { z } from 'zod';

import { HrvSummarySchema } from './hrv-summary';

export const DailyHrvSummariesSchema = z.object({
  hrvSummaries: z.array(HrvSummarySchema),
  userProfilePk: z.number(),
});

export type DailyHrvSummaries = z.infer<typeof DailyHrvSummariesSchema>;
