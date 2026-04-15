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
  GolfSummaryHole,
  GolfActivitiesPage,
  GolfCourseSnapshotListItem,
  GolfCourseSnapshot,
  GolfCourseSnapshotsList,
  GolfCourseSnapshotsPage,
  GolfCourseSummary,
  GolfHandicapType,
  GolfCourseTee,
  GolfDrivingRangeActivity,
  GolfScorecardHoleEntry,
  GolfScorecardDetail,
  GolfScorecardDetailsResponse,
  GolfScorecardDetailWithSnapshot,
  GolfScorecardActivity,
  GolfRound,
  GolfRoundsPage,
  GarminConnectClient,
  GarminConnectClientConfig,
  PersistedSession,
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
  GolfSummaryHoleSchema,
  GolfActivitiesPageSchema,
  GolfCourseSnapshotListItemSchema,
  GolfCourseSnapshotSchema,
  GolfCourseSnapshotsListSchema,
  GolfCourseSnapshotsPageSchema,
  GolfCourseSummarySchema,
  GolfHandicapTypeSchema,
  GolfCourseTeeSchema,
  GolfDrivingRangeActivitySchema,
  GolfScorecardHoleEntrySchema,
  GolfScorecardDetailSchema,
  GolfScorecardDetailsResponseSchema,
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

// Sleep service
export * from './sleep';

import { AuthenticationService } from './authentication-service';
import { GarminConnectClientImpl } from './client';
import type { GarminConnectClient, GarminConnectClientConfig, PersistedSession } from './types';
import { GarminUrls } from './urls';

// Result of the initial `login(config)` call. Either the login completed
// (credentials accepted, OAuth exchange done) or the account requires an MFA
// code to finish — in which case the caller passes the `MfaPending` value
// back into `login(pending, code)` to resume.
export interface LoginSuccess {
  readonly mfaRequired: false;
  readonly client: GarminConnectClient;
}
export interface MfaPending {
  readonly mfaRequired: true;
  readonly cookies: string;
}
export type LoginResult = LoginSuccess | MfaPending;

function isMfaPending(value: GarminConnectClientConfig | MfaPending): value is MfaPending {
  return 'mfaRequired' in value && value.mfaRequired === true;
}

// Logs in to Garmin Connect.
//
// Call 1 — initial login:
//   const result = await login({ username, password });
//   if (result.mfaRequired) {
//     const client = await login(result, await promptMfaCode());
//   } else {
//     const client = result.client;
//   }
//
// Call 2 — resume an MFA-pending login: pass the `MfaPending` value returned
// by call 1 together with the MFA code. Throws `MfaCodeInvalidError` on a bad
// code, `InvalidCredentialsError` on any other signin failure.
export function login(config: GarminConnectClientConfig): Promise<LoginResult>;
export function login(pending: MfaPending, mfaCode: string): Promise<GarminConnectClient>;
export async function login(
  configOrPending: GarminConnectClientConfig | MfaPending,
  mfaCode?: string
): Promise<LoginResult | GarminConnectClient> {
  const urls = new GarminUrls();

  if (isMfaPending(configOrPending)) {
    const httpClient = await AuthenticationService.completeAuthentication(urls, configOrPending, mfaCode);
    return GarminConnectClientImpl.fromHttpClient(httpClient, urls);
  }

  const context = await AuthenticationService.startAuthentication(
    urls,
    configOrPending.username,
    configOrPending.password
  );
  if (context.mfaRequired) {
    return { mfaRequired: true, cookies: context.cookies };
  }
  const httpClient = await AuthenticationService.completeAuthentication(urls, context);
  return { mfaRequired: false, client: GarminConnectClientImpl.fromHttpClient(httpClient, urls) };
}

// Restores a client from a previously-persisted session (no network calls).
// Use `client.getSession()` to obtain the session after authenticating.
export function fromSession(session: PersistedSession): GarminConnectClient {
  return GarminConnectClientImpl.fromSession(session);
}
