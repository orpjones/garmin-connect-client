import { z } from 'zod';

import { HrvStatus } from '../../types';

import { AgeGroup } from './age-group';
import { BreathingDisruptionSchema } from './breathing-disruption';
import { BreathingDisruptionSeverity } from './breathing-disruption-severity';
import { MomentValueSchema } from './moment-value';
import { SleepNeedSchema } from './sleep-need';
import { SleepScoreFeedback } from './sleep-score-feedback';
import { SleepScoreInsight } from './sleep-score-insight';
import { SleepScorePersonalizedInsight } from './sleep-score-personalized-insight';
import { SleepScoreQualifierKey } from './sleep-score-qualifier-key';
import { TimespanActivityLevelSchema } from './timespan-activity-level';
import { WellnessEpochRespirationAverageSchema } from './wellness-epoch-respiration-average';
import { WellnessEpochRespirationDataDTOSchema } from './wellness-epoch-respiration-data-dto';
import { WellnessEpochSPO2DataDTOSchema } from './wellness-epoch-sp02-data-dto';

export const DailySleepDataSchema = z.object({
  dailySleepDTO: z.object({
    id: z.number().nullable(),
    userProfilePK: z.number(),
    calendarDate: z.string(), // ISO 8601 format
    sleepTimeSeconds: z.number().nullable(),
    napTimeSeconds: z.number().nullable(),
    sleepWindowConfirmed: z.boolean().nullable(),
    sleepWindowConfirmationType: z.string().nullable(),
    sleepStartTimestampGMT: z.number().nullable(),
    sleepEndTimestampGMT: z.number().nullable(),
    sleepStartTimestampLocal: z.number().nullable(),
    sleepEndTimestampLocal: z.number().nullable(),
    autoSleepStartTimestampGMT: z.number().nullable(),
    autoSleepEndTimestampGMT: z.number().nullable(),
    sleepQualityTypePK: z.number().nullable(),
    sleepResultTypePK: z.number().nullable(),
    unmeasurableSleepSeconds: z.number().nullable(),
    deepSleepSeconds: z.number().nullable(),
    lightSleepSeconds: z.number().nullable(),
    remSleepSeconds: z.number().nullable(),
    awakeSleepSeconds: z.number().nullable(),
    deviceRemCapable: z.boolean(),
    retro: z.boolean(),
    sleepFromDevice: z.boolean().optional(),
    averageSpO2Value: z.number().optional(),
    lowestSpO2Value: z.number().optional(),
    highestSpO2Value: z.number().optional(),
    averageSpO2HRSleep: z.number().optional(),
    averageRespirationValue: z.number().optional(),
    lowestRespirationValue: z.number().optional(),
    highestRespirationValue: z.number().optional(),
    awakeCount: z.number().optional(),
    avgSleepStress: z.number().optional(),
    ageGroup: z.nativeEnum(AgeGroup).optional(),
    avgHeartRate: z.number().optional(),
    sleepScoreFeedback: z.nativeEnum(SleepScoreFeedback).optional(),
    sleepScoreInsight: z.nativeEnum(SleepScoreInsight).optional(),
    sleepScorePersonalizedInsight: z.nativeEnum(SleepScorePersonalizedInsight).optional(),
    sleepScores: z
      .object({
        totalDuration: z
          .object({
            qualifierKey: z.nativeEnum(SleepScoreQualifierKey),
            optimalStart: z.number(),
            optimalEnd: z.number(),
          })
          .optional(),
        stress: z.object({
          qualifierKey: z.nativeEnum(SleepScoreQualifierKey),
          optimalStart: z.number(),
          optimalEnd: z.number(),
        }),
        awakeCount: z.object({
          qualifierKey: z.nativeEnum(SleepScoreQualifierKey),
          optimalStart: z.number(),
          optimalEnd: z.number(),
        }),
        overall: z.object({
          value: z.number(),
          qualifierKey: z.nativeEnum(SleepScoreQualifierKey),
        }),
        remPercentage: z.object({
          value: z.number(),
          qualifierKey: z.nativeEnum(SleepScoreQualifierKey),
          optimalStart: z.number(),
          optimalEnd: z.number(),
          idealStartInSeconds: z.number(),
          idealEndInSeconds: z.number(),
        }),
        restlessness: z.object({
          qualifierKey: z.nativeEnum(SleepScoreQualifierKey),
          optimalStart: z.number(),
          optimalEnd: z.number(),
        }),
        lightPercentage: z.object({
          value: z.number(),
          qualifierKey: z.nativeEnum(SleepScoreQualifierKey),
          optimalStart: z.number(),
          optimalEnd: z.number(),
          idealStartInSeconds: z.number(),
          idealEndInSeconds: z.number(),
        }),
        deepPercentage: z.object({
          value: z.number(),
          qualifierKey: z.nativeEnum(SleepScoreQualifierKey),
          optimalStart: z.number(),
          optimalEnd: z.number(),
          idealStartInSeconds: z.number(),
          idealEndInSeconds: z.number(),
        }),
      })
      .optional(),
    sleepVersion: z.number().optional(),
    sleepNeed: SleepNeedSchema.optional(),
    nextSleepNeed: SleepNeedSchema.optional(),
    breathingDisruptionSeverity: z.nativeEnum(BreathingDisruptionSeverity).optional(),
  }),
  sleepMovement: z.array(TimespanActivityLevelSchema).nullable(),
  remSleepData: z.boolean().nullable(),
  sleepLevels: z.array(TimespanActivityLevelSchema).nullable(),
  sleepRestlessMoments: z.array(MomentValueSchema).optional(),
  restlessMomentsCount: z.number().optional(),
  wellnessSpO2SleepSummaryDTO: z
    .object({
      userProfilePk: z.number(),
      deviceId: z.number(),
      sleepMeasurementStartGMT: z.string(), // ISO 8601 format
      sleepMeasurementEndGMT: z.string(), // ISO 8601 format
      alertThresholdValue: z.number().nullable(),
      numberOfEventsBelowThreshold: z.number().nullable(),
      durationOfEventsBelowThreshold: z.number().nullable(),
      averageSPO2: z.number(),
      averageSpO2HR: z.number(),
      lowestSPO2: z.number(),
    })
    .optional(),
  wellnessEpochSPO2DataDTOList: z.array(WellnessEpochSPO2DataDTOSchema).optional(),
  wellnessEpochRespirationDataDTOList: z.array(WellnessEpochRespirationDataDTOSchema).optional(),
  wellnessEpochRespirationAveragesList: z.array(WellnessEpochRespirationAverageSchema).optional(),
  respirationVersion: z.number().optional(),
  sleepHeartRate: z.array(MomentValueSchema).optional(),
  sleepStress: z.array(MomentValueSchema).optional(),
  sleepBodyBattery: z.array(MomentValueSchema).optional(),
  skinTempDataExists: z.boolean().optional(),
  hrvData: z.array(MomentValueSchema).optional(),
  breathingDisruptionsData: z.array(BreathingDisruptionSchema).optional(),
  avgOvernightHrv: z.number().optional(),
  hrvStatus: z.nativeEnum(HrvStatus).optional(),
  bodyBatteryChange: z.number().optional(),
  restingHeartRate: z.number().optional(),
});

export type DailySleepData = z.infer<typeof DailySleepDataSchema>;
