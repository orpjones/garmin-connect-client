export type {
  Activity,
  ActivityType,
  AcuteTrainingLoadDTO,
  BodyBattery,
  BodyBatteryActivityEvent,
  BodyBatteryDynamicFeedbackEvent,
  Calories,
  EventType,
  Floors,
  GolfActivityHole,
  GolfActivitiesResponse,
  GolfCourseSnapshot,
  GolfCourseSnapshotResponse,
  GolfDrivingRangeActivity,
  GolfScorecardActivity,
  GarminConnectClient,
  GarminConnectClientConfig,
  HeartRate,
  HeartRateZoneScalar,
  Hydration,
  IntensityMinutes,
  Movement,
  Privacy,
  PulseOx,
  RecordedDevice,
  Respiration,
  Steps,
  Stress,
  TrainingStatusData,
  TrainingStatusDailyScalar,
  TrainingStatusWeeklyScalar,
  UserDailySummary,
  WellnessChronology,
} from './types';

export {
  ActivityTypeKey,
  EventTypeKey,
  PrivacyTypeKey,
  StressQualifier,
  BodyBatteryLevel,
  TrainingStatus,
  FitnessTrend,
  AcwrStatus,
  TrainingStatusFeedbackPhrase,
  AcwrStatusFeedback,
  BodyBatteryFeedbackType,
  BodyBatteryShortFeedback,
  BodyBatteryEventType,
  HrvStatus,
  Sport,
  SubSport,
  ChangeState,
  TrainingMethod,
  // Zod schemas for runtime validation
  ActivitySchema,
  ActivityTypeSchema,
  EventTypeSchema,
  PrivacySchema,
  GolfActivityHoleSchema,
  GolfActivitiesResponseSchema,
  GolfCourseSnapshotSchema,
  GolfCourseSnapshotResponseSchema,
  GolfDrivingRangeActivitySchema,
  GolfScorecardActivitySchema,
  StepsSchema,
  FloorsSchema,
  MovementSchema,
  CaloriesSchema,
  HeartRateSchema,
  IntensityMinutesSchema,
  StressSchema,
  BodyBatteryDynamicFeedbackEventSchema,
  BodyBatteryActivityEventSchema,
  BodyBatterySchema,
  HydrationSchema,
  RespirationSchema,
  PulseOxSchema,
  WellnessChronologySchema,
  UserDailySummarySchema,
  AcuteTrainingLoadDTOSchema,
  TrainingStatusDataSchema,
  RecordedDeviceSchema,
  TrainingStatusDailyScalarSchema,
  TrainingStatusWeeklyScalarSchema,
  HeartRateZoneScalarSchema,
} from './types';

// Export all custom exceptions
export {
  AuthenticationError,
  AuthenticationContextError,
  ClientError,
  CsrfTokenError,
  GarminConnectError,
  HttpError,
  InvalidCredentialsError,
  MfaCodeError,
  MfaCodeInvalidError,
  MfaError,
  MfaRequiredError,
  NotAuthenticatedError,
  NotImplementedError,
  OAuthError,
  OAuthIdentityError,
  OAuthTokenError,
} from './errors';

import { AuthContext } from './auth-context';
import { AuthenticationService, AuthenticationSuccess } from './authentication-service';
import { GarminConnectClientImpl } from './client';
import type { GarminConnectClient, GarminConnectClientConfig } from './types';
import { GarminUrls } from './urls';

// Creates an authentication context by starting the login process
// Returns Promise resolving to an AuthContext with mfaRequired flag
//
// Example:
//   const authContext = await createAuthContext({ username, password });
//   if (authContext.mfaRequired) {
//     const mfaCode = await getUserMfaCode();
//     const client = await create(authContext, mfaCode);
//   } else {
//     const client = await create(authContext);
//   }
export async function createAuthContext(config: GarminConnectClientConfig): Promise<AuthContext> {
  const urls = new GarminUrls();
  const result = await AuthenticationService.startAuthentication(urls, config.username, config.password);

  // Authentication succeeded - no MFA required, or MFA required
  return result instanceof AuthenticationSuccess
    ? new AuthContext(false, result.cookies, undefined, result.ticket)
    : new AuthContext(true, result.cookies, result.mfaMethod);
}

// Creates a new Garmin Connect client using an authentication context
// Returns Promise resolving to an authenticated client instance
//
// Example:
//   const authContext = await createAuthContext({ username, password });
//   const client = await create(authContext, authContext.mfaRequired ? mfaCode : undefined);
export async function create(context: AuthContext, mfaCode?: string): Promise<GarminConnectClient> {
  const urls = new GarminUrls();
  return GarminConnectClientImpl.create(context, urls, mfaCode);
}

export { AuthContext, MfaMethod, parseMfaMethod } from './auth-context';

export type { AuthenticationParameters } from './authentication-service';
