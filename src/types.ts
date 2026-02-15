// Type definitions for Garmin Connect

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export enum ActivityTypeKey {
  // Walking
  WALKING = 'walking',
  CASUAL_WALKING = 'casual_walking',
  SPEED_WALKING = 'speed_walking',

  // Running
  RUNNING = 'running',
  INDOOR_RUNNING = 'indoor_running',
  OBSTACLE_COURSE_RACING = 'obstacle_course_racing',
  STREET_RUNNING = 'street_running',
  TRACK_RUNNING = 'track_running',
  TRAIL_RUNNING = 'trail_running',
  TREADMILL_RUNNING = 'treadmill_running',
  ULTRA_RUNNING = 'ultra_running',
  VIRTUAL_RUNNING = 'virtual_running',

  // Cycling
  CYCLING = 'cycling',
  BMX = 'bmx',
  CYCLOCROSS = 'cyclocross',
  DOWNHILL_MOUNTAIN_BIKING = 'downhill_mountain_biking',
  E_BIKING = 'e_biking',
  E_MOUNTAIN_BIKING = 'e_mountain_biking',
  E_ENDURO_MOUNTAIN_BIKING = 'e_enduro_mountain_biking',
  ENDURO_MOUNTAIN_BIKING = 'enduro_mountain_biking',
  GRAVEL_CYCLING = 'gravel_cycling',
  HANDCYCLING = 'handcycling',
  INDOOR_CYCLING = 'indoor_cycling',
  INDOOR_HANDCYCLING = 'indoor_handcycling',
  MOUNTAIN_BIKING = 'mountain_biking',
  RECUMBENT_CYCLING = 'recumbent_cycling',
  ROAD_CYCLING = 'road_cycling',
  TRACK_CYCLING = 'track_cycling',
  VIRTUAL_CYCLING = 'virtual_cycling',

  // Swimming
  SWIMMING = 'swimming',
  POOL_SWIM = 'pool_swim',
  OPEN_WATER_SWIMMING = 'open_water_swimming',

  // Hiking
  HIKING = 'hiking',
  RUCKING = 'rucking',

  // Gym & Fitness Equipment
  FITNESS = 'fitness',
  BOULDERING = 'bouldering',
  DANCE_FITNESS = 'dance_fitness',
  ELLIPTICAL = 'elliptical',
  HIIT = 'hiit',
  CARDIO = 'cardio',
  INDOOR_CLIMBING = 'indoor_climbing',
  INDOOR_ROWING = 'indoor_rowing',
  JUMP_ROPE = 'jump_rope',
  MOBILITY = 'mobility',
  ONSHORE_GRINDING = 'onshore_grinding',
  PILATES = 'pilates',
  STAIR_STEPPER = 'stair_stepper',
  STRENGTH_TRAINING = 'strength_training',
  YOGA = 'yoga',

  // Diving
  DIVING = 'diving',
  APNEA = 'apnea',
  APNEA_HUNT = 'apnea_hunt',
  CCR_DIVE = 'ccr_dive',
  GAUGE_DIVE = 'gauge_dive',
  MULTI_GAS_DIVE = 'multi_gas_dive',
  POOL_APNEA = 'pool_apnea',
  SINGLE_GAS_DIVE = 'single_gas_dive',

  // Winter Sports
  WINTER_SPORTS = 'winter_sports',
  BACKCOUNTRY_SKIING = 'backcountry_skiing',
  BACKCOUNTRY_SNOWBOARDING = 'backcountry_snowboarding',
  CROSS_COUNTRY_CLASSIC_SKIING = 'cross_country_classic_skiing',
  RESORT_SKIING = 'resort_skiing',
  RESORT_SNOWBOARDING = 'resort_snowboarding',
  CROSS_COUNTRY_SKATE_SKIING = 'cross_country_skate_skiing',
  SKATING = 'skating',
  SNOWSHOEING = 'snowshoeing',
  SNOWMOBILING = 'snowmobiling',

  // Water Sports
  WATER_SPORTS = 'water_sports',
  BOATING = 'boating',
  FISHING = 'fishing',
  KAYAKING = 'kayaking',
  KITEBOARDING = 'kiteboarding',
  OFFSHORE_GRINDING = 'offshore_grinding',
  CANOEING = 'canoeing',
  ROWING = 'rowing',
  SAILING = 'sailing',
  SNORKELING = 'snorkeling',
  STAND_UP_PADDLEBOARDING = 'stand_up_paddleboarding',
  SURFING = 'surfing',
  WAKEBOARDING = 'wakeboarding',
  WAKESURFING = 'wakesurfing',
  TUBING = 'tubing',
  WATER_SKIING = 'water_skiing',
  WHITEWATER = 'whitewater',
  WINDSURFING = 'windsurfing',

  // Team Sports
  TEAM_SPORTS = 'team_sports',
  AMERICAN_FOOTBALL = 'american_football',
  BASEBALL = 'baseball',
  BASKETBALL = 'basketball',
  CRICKET = 'cricket',
  FIELD_HOCKEY = 'field_hockey',
  ICE_HOCKEY = 'ice_hockey',
  LACROSSE = 'lacrosse',
  RUGBY = 'rugby',
  SOCCER_FOOTBALL = 'soccer_football',
  SOFTBALL = 'softball',
  ULTIMATE_DISC = 'ultimate_disc',
  VOLLEYBALL = 'volleyball',

  // Racket Sports
  RACKET_SPORTS = 'racket_sports',
  BADMINTON = 'badminton',
  PADEL = 'padel',
  PICKLEBALL = 'pickleball',
  PLATFORM_TENNIS = 'platform_tennis',
  RACQUETBALL = 'racquetball',
  SQUASH = 'squash',
  TABLE_TENNIS = 'table_tennis',
  TENNIS = 'tennis',

  // Parasports
  PARASPORTS = 'parasports',
  PUSHING_RUN_SPEED = 'pushing_run_speed',
  PUSHING_WALK_SPEED = 'pushing_walk_speed',

  // Other
  OTHER = 'other',
  ARCHERY = 'archery',
  ATV = 'atv',
  AUTO_RACING = 'auto_racing',
  BIKE_TO_RUN_TRANSITION = 'bike_to_run_transition',
  BOXING = 'boxing',
  BREATHWORK = 'breathwork',
  DISC_GOLF = 'disc_golf',
  DRIVING = 'driving',
  GAMING = 'gaming',
  FLOOR_CLIMBING = 'floor_climbing',
  FLYING = 'flying',
  GOLF = 'golf',
  HANG_GLIDING = 'hang_gliding',
  HORSEBACK_RIDING = 'horseback_riding',
  HUNTING = 'hunting',
  INLINE_SKATING = 'inline_skating',
  MEDITATION = 'meditation',
  MIXED_MARTIAL_ARTS = 'mixed_martial_arts',
  MOTOCROSS = 'motocross',
  MOTORCYCLING = 'motorcycling',
  MOUNTAINEERING = 'mountaineering',
  OVERLAND = 'overland',
  RC_DRONE = 'rc_drone',
  ROCK_CLIMBING = 'rock_climbing',
  RUN_TO_BIKE_TRANSITION = 'run_to_bike_transition',
  SKY_DIVING = 'sky_diving',
  STOPWATCH = 'stopwatch',
  SWIM_TO_BIKE_TRANSITION = 'swim_to_bike_transition',
  TRANSITION = 'transition',
  WINGSUIT_FLYING = 'wingsuit_flying',
}

export enum EventTypeKey {
  UNCATEGORIZED = 'uncategorized',
  FITNESS = 'fitness',
  GEOCACHING = 'geocaching',
  RACE = 'race',
  RECREATION = 'recreation',
  SPECIAL_EVENT = 'specialEvent',
  TOURING = 'touring',
  TRAINING = 'training',
  TRANSPORTATION = 'transportation',
}

export enum PrivacyTypeKey {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SUBSCRIBERS = 'subscribers',
  FRIENDS = 'friends',
}

export enum StressQualifier {
  STRESSFUL = 'stressful',
  BALANCED = 'balanced',
  CALM = 'calm',
}

export enum BodyBatteryLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TrainingStatus {
  RECOVERY = 5,
  MAINTAINING = 4,
  PRODUCTIVE = 7,
  PEAKING = 6,
  DETRAINING = 1,
  OVERREACHING = 2,
  UNPRODUCTIVE = 3,
}

export enum FitnessTrend {
  IMPROVING = 3,
  MAINTAINING = 2,
  DECLINING = 1,
}

export enum AcwrStatus {
  LOW = 'LOW',
  OPTIMAL = 'OPTIMAL',
  HIGH = 'HIGH',
}

export enum TrainingStatusFeedbackPhrase {
  RECOVERY_1 = 'RECOVERY_1',
  RECOVERY_2 = 'RECOVERY_2',
  MAINTAINING_1 = 'MAINTAINING_1',
  MAINTAINING_2 = 'MAINTAINING_2',
  PRODUCTIVE_1 = 'PRODUCTIVE_1',
  PRODUCTIVE_2 = 'PRODUCTIVE_2',
  PRODUCTIVE_3 = 'PRODUCTIVE_3',
  PEAKING_1 = 'PEAKING_1',
  PEAKING_2 = 'PEAKING_2',
}

export enum AcwrStatusFeedback {
  FEEDBACK_1 = 'FEEDBACK_1',
  FEEDBACK_2 = 'FEEDBACK_2',
  FEEDBACK_3 = 'FEEDBACK_3',
}

export enum BodyBatteryFeedbackType {
  NONE = 'NONE',
  EXERCISE_TRAINING_EFFECT_BELOW_2 = 'EXERCISE_TRAINING_EFFECT_BELOW_2',
  EXERCISE_TRAINING_EFFECT_3 = 'EXERCISE_TRAINING_EFFECT_3',
  RECOVERY_LONG_BODY_BATTERY_NOT_INCREASE = 'RECOVERY_LONG_BODY_BATTERY_NOT_INCREASE',
  RECOVERY_LONG_BODY_BATTERY_INCREASE = 'RECOVERY_LONG_BODY_BATTERY_INCREASE',
}

export enum BodyBatteryShortFeedback {
  NONE = 'NONE',
  EASY_RECOVERY = 'EASY_RECOVERY',
  IMPROVING_AEROBIC_BASE = 'IMPROVING_AEROBIC_BASE',
  LONG_RESTFUL_PERIOD = 'LONG_RESTFUL_PERIOD',
  SLEEP_PREPARATION_RECOVERING_AND_INTENSIVE_EXERCISE = 'SLEEP_PREPARATION_RECOVERING_AND_INTENSIVE_EXERCISE',
  SLEEP_TIME_PASSED_RECOVERING_AND_EXERCISE = 'SLEEP_TIME_PASSED_RECOVERING_AND_EXERCISE',
  DAY_RECOVERING_AND_EXERCISE = 'DAY_RECOVERING_AND_EXERCISE',
}

export enum BodyBatteryEventType {
  SLEEP = 'SLEEP',
  ACTIVITY = 'ACTIVITY',
  RECOVERY = 'RECOVERY',
}

export enum HrvStatus {
  BALANCED = 'BALANCED',
  UNBALANCED = 'UNBALANCED',
}

export enum Sport {
  RUNNING = 'RUNNING',
  CYCLING = 'CYCLING',
  SWIMMING = 'SWIMMING',
  DEFAULT = 'DEFAULT',
}

export enum SubSport {
  GENERIC = 'GENERIC',
  ROAD = 'ROAD',
  TRAIL = 'TRAIL',
  TRACK = 'TRACK',
  INDOOR = 'INDOOR',
}

export enum ChangeState {
  UNCHANGED = 'UNCHANGED',
  CHANGED = 'CHANGED',
}

export enum TrainingMethod {
  HR_RESERVE = 'HR_RESERVE',
  MAX_HR = 'MAX_HR',
  LACTATE_THRESHOLD = 'LACTATE_THRESHOLD',
}

// ============================================================================
// Core Activity Types
// ============================================================================

export const ActivityTypeSchema = z.object({
  typeId: z.number(),
  typeKey: z.nativeEnum(ActivityTypeKey),
  parentTypeId: z.number(),
  isHidden: z.boolean(),
  restricted: z.boolean(),
  trimmable: z.boolean(),
});

export const EventTypeSchema = z.object({
  typeId: z.number(),
  typeKey: z.nativeEnum(EventTypeKey),
  sortOrder: z.number(),
});

export const PrivacySchema = z.object({
  typeId: z.number(),
  typeKey: z.nativeEnum(PrivacyTypeKey),
});

// Split summary schema for activity splits
const SplitSummarySchema = z.object({
  averageElevationGain: z.number().optional(),
  averageSpeed: z.number().optional(),
  distance: z.number().optional(),
  duration: z.number().optional(),
  elevationLoss: z.number().optional(),
  maxDistance: z.number().optional(),
  maxElevationGain: z.number().optional(),
  maxSpeed: z.number().optional(),
  noOfSplits: z.number().optional(),
  numClimbSends: z.number().optional(),
  numFalls: z.number().optional(),
  splitType: z.string().optional(),
  totalAscent: z.number().optional(),
});

// Summarized dive info schema
const SummarizedDiveInfoSchema = z.object({
  summarizedDiveGases: z.array(z.unknown()),
});

// Summarized exercise set schema for strength training activities
const SummarizedExerciseSetSchema = z.object({
  category: z.string().optional(),
  duration: z.number().optional(), // in milliseconds
  maxWeight: z.number().optional(),
  reps: z.number().optional(),
  sets: z.number().optional(),
  subCategory: z.string().optional(),
  volume: z.number().optional(),
});

export const ActivitySchema = z
  .object({
    // Required fields
    activityId: z.number(),
    activityName: z.string(),
    activityType: ActivityTypeSchema,
    duration: z.number(), // in seconds
    eventType: EventTypeSchema,
    ownerDisplayName: z.string(),
    ownerId: z.number(),
    privacy: PrivacySchema,
    startTimeGMT: z.string(), // ISO 8601 format
    startTimeLocal: z.string(), // ISO 8601 format

    // Optional fields (alphabetical)
    activeCalories: z.number().optional(),
    activeSets: z.number().optional(),
    activityTrainingLoad: z.number().optional(),
    aerobicTrainingEffect: z.number().optional(),
    aerobicTrainingEffectMessage: z.string().optional(),
    anaerobicTrainingEffect: z.number().optional(),
    anaerobicTrainingEffectMessage: z.string().optional(),
    atpActivity: z.boolean().optional(),
    autoCalcCalories: z.boolean().optional(),
    avgGradeAdjustedSpeed: z.number().optional(),
    avgGroundContactBalance: z.number().optional(),
    avgGroundContactTime: z.number().optional(),
    avgPower: z.number().optional(),
    avgRespirationRate: z.number().optional(),
    avgStrideLength: z.number().optional(),
    avgVerticalOscillation: z.number().optional(),
    avgVerticalRatio: z.number().optional(),
    averageHR: z.number().optional(),
    averageRunningCadenceInStepsPerMinute: z.number().optional(),
    averageSpeed: z.number().optional(),
    beginTimestamp: z.number().optional(), // Unix timestamp in milliseconds
    bmrCalories: z.number().optional(),
    calories: z.number().optional(),
    courseId: z.number().optional(),
    courseName: z.string().optional(),
    decoDive: z.boolean().optional(),
    deviceId: z.number().optional(),
    differenceBodyBattery: z.number().optional(),
    distance: z.number().optional(), // in meters
    elapsedDuration: z.number().optional(), // in seconds
    elevationCorrected: z.boolean().optional(),
    elevationGain: z.number().optional(), // in meters
    elevationLoss: z.number().optional(), // in meters
    endLatitude: z.number().optional(),
    endLongitude: z.number().optional(),
    endTimeGMT: z.string().optional(), // ISO 8601 format
    fastestSplit_1000: z.number().optional(),
    fastestSplit_1609: z.number().optional(),
    fastestSplit_5000: z.number().optional(),
    favorite: z.boolean().optional(),
    hasHeatMap: z.boolean().optional(),
    hasImages: z.boolean().optional(),
    hasPolyline: z.boolean().optional(),
    hasSplits: z.boolean().optional(),
    hasVideo: z.boolean().optional(),
    hrTimeInZone_1: z.number().optional(),
    hrTimeInZone_2: z.number().optional(),
    hrTimeInZone_3: z.number().optional(),
    hrTimeInZone_4: z.number().optional(),
    hrTimeInZone_5: z.number().optional(),
    lapCount: z.number().optional(),
    locationName: z.string().optional(),
    manufacturer: z.string().optional(),
    maxDoubleCadence: z.number().optional(),
    maxElevation: z.number().optional(),
    maxHR: z.number().optional(),
    maxPower: z.number().optional(),
    maxRespirationRate: z.number().optional(),
    maxRunningCadenceInStepsPerMinute: z.number().optional(),
    maxSpeed: z.number().optional(),
    maxTemperature: z.number().optional(),
    maxVerticalSpeed: z.number().optional(),
    minActivityLapDuration: z.number().optional(),
    minElevation: z.number().optional(),
    minHR: z.number().optional(),
    minRespirationRate: z.number().optional(),
    minTemperature: z.number().optional(),
    moderateIntensityMinutes: z.number().optional(),
    movingDuration: z.number().optional(), // in seconds
    normPower: z.number().optional(),
    ownerFullName: z.string().optional(),
    ownerProfileImageUrlLarge: z.string().url().optional(),
    ownerProfileImageUrlMedium: z.string().url().optional(),
    ownerProfileImageUrlSmall: z.string().url().optional(),
    parent: z.boolean().optional(),
    powerTimeInZone_1: z.number().optional(),
    powerTimeInZone_2: z.number().optional(),
    powerTimeInZone_3: z.number().optional(),
    powerTimeInZone_4: z.number().optional(),
    powerTimeInZone_5: z.number().optional(),
    pr: z.boolean().optional(),
    purposeful: z.boolean().optional(), // Fixed typo: was "purposefull"
    qualifyingDive: z.boolean().optional(),
    requestorHasAccess: z.boolean().optional(),
    splitSummaries: z.array(SplitSummarySchema).optional(),
    sportTypeId: z.number().optional(),
    startLatitude: z.number().optional(),
    startLongitude: z.number().optional(),
    steps: z.number().optional(),
    summarizedDiveInfo: SummarizedDiveInfoSchema.optional(),
    summarizedExerciseSets: z.array(SummarizedExerciseSetSchema).optional(),
    timeZoneId: z.number().optional(),
    totalReps: z.number().optional(),
    totalSets: z.number().optional(),
    trainingEffectLabel: z.string().optional(),
    userPro: z.boolean().optional(),
    userRoles: z.array(z.string()).optional(),
    vigorousIntensityMinutes: z.number().optional(),
    vO2MaxValue: z.number().optional(),
    waterEstimated: z.number().optional(),
    workoutId: z.number().optional(),
  })
  .passthrough(); // Allow additional fields for future API changes

// TypeScript types inferred from schemas
export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type Privacy = z.infer<typeof PrivacySchema>;
export type Activity = z.infer<typeof ActivitySchema>;

// ============================================================================
// Golf Course Types
// ============================================================================

export const GolfCourseSnapshotListItemSchema = z.object({
  courseGlobalId: z.number(),
  courseSnapshotId: z.number(),
  name: z.string(),
  country: z.string(),
  city: z.string(),
  state: z.string().optional(),
  releaseDate: z.string(), // ISO date format (YYYY-MM-DD)
  lastPlayedTime: z.number(), // Unix timestamp in seconds
});

export const GolfCourseSnapshotsPageSchema = z.object({
  pageNumber: z.number(),
  rowsPerPage: z.number(),
  totalRows: z.number(),
  courseSnapshots: z.array(GolfCourseSnapshotListItemSchema),
});

export type GolfCourseSnapshotListItem = z.infer<typeof GolfCourseSnapshotListItemSchema>;
export type GolfCourseSnapshotsPage = z.infer<typeof GolfCourseSnapshotsPageSchema>;

export const GolfHandicapTypeSchema = z.enum(['MEN', 'WOMEN']);

export const GolfCourseTeeSchema = z
  .object({
    name: z.string(),
    handicapType: GolfHandicapTypeSchema.or(z.string()),
    rating: z.number(),
    slope: z.number(),
    holeHandicaps: z.string().optional(),
  })
  .passthrough();

export const GolfCourseSnapshotSchema = z
  .object({
    courseGlobalId: z.number(),
    courseSnapshotId: z.number(),
    name: z.string(),
    holePars: z.string(),
    frontNinePar: z.number(),
    backNinePar: z.number(),
    roundPar: z.number(),
    tees: z.array(GolfCourseTeeSchema),
    city: z.string().optional(),
    continent: z.string().optional(),
    country: z.string().optional(),
    designYear: z.number().optional(),
    designer: z.string().optional(),
    fairways: z.string().optional(),
    greensType: z.string().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    phone: z.string().optional(),
    releaseDate: z.string().optional(),
    state: z.string().optional(),
    street: z.string().optional(),
    web: z.string().optional(),
    zip: z.string().optional(),
  })
  .passthrough();

export const GolfCourseSnapshotsListSchema = z.array(GolfCourseSnapshotSchema);

export const GolfCourseSummarySchema = z.object({
  courseGlobalId: z.number(),
  courseSnapshotId: z.number(),
  name: z.string(),
  par: z.number(),
  holeCount: z.number(),
  tees: z.array(GolfCourseTeeSchema),
});

export type GolfHandicapType = z.infer<typeof GolfHandicapTypeSchema>;
export type GolfCourseTee = z.infer<typeof GolfCourseTeeSchema>;
export type GolfCourseSnapshot = z.infer<typeof GolfCourseSnapshotSchema>;
export type GolfCourseSnapshotsList = z.infer<typeof GolfCourseSnapshotsListSchema>;
export type GolfCourseSummary = z.infer<typeof GolfCourseSummarySchema>;

// ============================================================================
// Golf Activity Types
// ============================================================================

// Summary holes from the activity list (lighter-weight than scorecard detail holes).
export const GolfSummaryHoleSchema = z.object({
  number: z.number(),
  strokes: z.number().optional(),
});

// Detailed holes from scorecard detail payloads.
// strokes, handicapScore, putts can be omitted for unplayed holes (e.g. incomplete rounds).
export const GolfScorecardHoleEntrySchema = z.object({
  number: z.number(),
  strokes: z.number().optional(),
  penalties: z.number().optional(),
  handicapScore: z.number().optional(),
  putts: z.number().optional(),
  fairwayShotOutcome: z.string().optional(),
  pinPositionLat: z.number().optional(),
  pinPositionLon: z.number().optional(),
});

export const GolfScorecardActivitySchema = z.object({
  id: z.number(),
  scoreType: z.string(), // e.g., "STROKE_PLAY"
  courseName: z.string(),
  holePars: z.string(), // String representation of par for each hole
  startTime: z.string(), // ISO 8601 format
  strokes: z.number(),
  handicappedStrokes: z.number().optional(),
  scoreWithHandicap: z.number().optional(),
  scoreWithoutHandicap: z.number(),
  holesCompleted: z.number(),
  activityHoles: z.array(GolfSummaryHoleSchema),
  roundType: z.string(), // e.g., "ALL", "FRONT_9"
  courseCounting: z.boolean(),
});

// Some fields can be omitted when scorecard data is incomplete (e.g. practice rounds).
export const GolfScorecardDetailSchema = z
  .object({
    id: z.number(),
    courseGlobalId: z.number(),
    courseSnapshotId: z.number(),
    scoreType: z.string(),
    roundType: z.string(),
    startTime: z.string(), // ISO 8601 format
    strokes: z.number(),
    handicappedStrokes: z.number().optional(),
    teeBox: z.string().optional(),
    teeBoxRating: z.number().optional(),
    teeBoxSlope: z.number().optional(),
    handicapType: GolfHandicapTypeSchema.or(z.string()).optional(),
    holes: z.array(GolfScorecardHoleEntrySchema),
  })
  .passthrough();

const GolfScorecardDetailEntrySchema = z
  .object({
    scorecard: GolfScorecardDetailSchema,
  })
  .passthrough();

export const GolfScorecardDetailsResponseSchema = z
  .object({
    scorecardDetails: z.array(GolfScorecardDetailEntrySchema),
    courseSnapshots: z.array(GolfCourseSnapshotSchema),
  })
  .passthrough();

export const GolfDrivingRangeActivitySchema = z.object({
  drivingRangeId: z.number(),
  clientKey: z.string(),
  name: z.string(),
  startTime: z.string(), // ISO 8601 format
  numShots: z.number(),
  numClubs: z.number(),
  numVideo: z.number(),
  type: z.string(), // e.g., "DRIVING_RANGE"
});

export const GolfActivitiesPageSchema = z.object({
  pageNumber: z.number(),
  rowsPerPage: z.number(),
  hasNextPage: z.boolean(),
  scorecardActivities: z.array(GolfScorecardActivitySchema),
  tournamentActivities: z.array(z.unknown()), // Tournament activities structure not fully captured
  drivingRangeActivities: z.array(GolfDrivingRangeActivitySchema),
});

export type GolfSummaryHole = z.infer<typeof GolfSummaryHoleSchema>;
export type GolfScorecardHoleEntry = z.infer<typeof GolfScorecardHoleEntrySchema>;
export type GolfScorecardActivity = z.infer<typeof GolfScorecardActivitySchema>;
export type GolfScorecardDetail = z.infer<typeof GolfScorecardDetailSchema>;
export type GolfScorecardDetailsResponse = z.infer<typeof GolfScorecardDetailsResponseSchema>;
export type GolfDrivingRangeActivity = z.infer<typeof GolfDrivingRangeActivitySchema>;
export type GolfActivitiesPage = z.infer<typeof GolfActivitiesPageSchema>;

export interface GolfScorecardDetailWithSnapshot {
  scorecard: GolfScorecardDetail;
  courseSnapshot?: GolfCourseSnapshot;
}

// Convenience type for a golf round with all relevant details
export interface GolfRound {
  scorecardId: number;
  courseId: number; // Garmin course global ID (courseGlobalId from scorecard)
  courseName: string;
  courseRating?: number;
  courseSlope?: number;
  coursePar?: number;
  holesPlayed: number;
  totalScore: number;
  tees?: string;
  startTime: string; // ISO 8601 format
  perHoleScore: Array<{
    holeNumber: number;
    par?: number;
    strokes?: number; // Omitted for unplayed holes (e.g. incomplete rounds)
  }>;
}

// Paginated response for golf rounds
export interface GolfRoundsPage {
  pageNumber: number;
  rowsPerPage: number;
  hasNextPage: boolean;
  rounds: GolfRound[];
}

// ============================================================================
// Wellness Types
// ============================================================================

export const StepsSchema = z.object({
  goal: z.number(),
  value: z.number(),
  distanceInMeters: z.number(),
});

export const FloorsSchema = z.object({
  goal: z.number().optional(),
  value: z.number(),
  distanceInMeters: z.number(),
});

export const MovementSchema = z.object({
  steps: StepsSchema,
  pushes: z.record(z.never()).optional(),
  floorsAscended: FloorsSchema,
  floorsDescended: FloorsSchema,
});

export const CaloriesSchema = z.object({
  burnedResting: z.number(),
  burnedActive: z.number(),
  burnedTotal: z.number(),
  consumedGoal: z.number(),
  consumedRemaining: z.number(),
});

export const HeartRateSchema = z.object({
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  restingValue: z.number().optional(),
});

export const IntensityMinutesSchema = z.object({
  goal: z.number(),
  moderate: z.number(),
  vigorous: z.number(),
});

export const StressSchema = z.object({
  avgLevel: z.number(),
  maxLevel: z.number().optional(),
  restProportion: z.number(),
  activityProportion: z.number(),
  uncategorizedProportion: z.number(),
  lowStressProportion: z.number(),
  mediumStressProportion: z.number(),
  highStressProportion: z.number(),
  qualifier: z.nativeEnum(StressQualifier),
  totalDurationInMillis: z.number(),
  restDurationInMillis: z.number(),
  activityDurationInMillis: z.number(),
  uncategorizedDurationInMillis: z.number(),
  lowStressDurationInMillis: z.number(),
  mediumStressDurationInMillis: z.number(),
  highStressDurationInMillis: z.number(),
});

export const BodyBatteryDynamicFeedbackEventSchema = z.object({
  eventTimestampGmt: z.string(), // ISO 8601 format
  bodyBatteryLevel: z.nativeEnum(BodyBatteryLevel),
  feedbackShortType: z.string(),
  feedbackLongType: z.string(),
});

export const BodyBatteryActivityEventSchema = z.object({
  eventType: z.nativeEnum(BodyBatteryEventType),
  eventStartTimeGmt: z.string(), // ISO 8601 format
  eventStartTimeLocal: z.string(), // ISO 8601 format
  bodyBatteryImpact: z.number(),
  feedbackType: z.nativeEnum(BodyBatteryFeedbackType),
  shortFeedback: z.nativeEnum(BodyBatteryShortFeedback),
  deviceId: z.number(),
  durationInMillis: z.number(),
});

export const BodyBatterySchema = z.object({
  minValue: z.number(),
  maxValue: z.number(),
  chargedValue: z.number(),
  drainedValue: z.number(),
  latestValue: z.number(),
  featureVersion: z.string(),
  dynamicFeedbackEvent: BodyBatteryDynamicFeedbackEventSchema.optional(),
  endOfDayDynamicFeedbackEvent: BodyBatteryDynamicFeedbackEventSchema.optional(),
  activityEvents: z.array(BodyBatteryActivityEventSchema),
});

export const HydrationSchema = z.object({
  goalInMl: z.number(),
  goalInFractionalMl: z.number(),
  consumedInMl: z.number(),
  consumedInFractionalMl: z.number(),
});

export const RespirationSchema = z.object({
  avgValue: z.number(),
  maxValue: z.number().optional(),
  minValue: z.number().optional(),
  latestValue: z.number().optional(),
  latestTimestampGmt: z.string().optional(), // ISO 8601 format
  algorithmVersion: z.number(),
});

export const PulseOxSchema = z.object({
  avgValue: z.number(),
  minValue: z.number().optional(),
  latestValue: z.number().optional(),
  latestTimestampGmt: z.string().optional(), // ISO 8601 format
  latestTimestampLocal: z.string().optional(), // ISO 8601 format
  avgAltitudeInMeters: z.number().optional(),
});

export const WellnessChronologySchema = z.object({
  startTimestampGmt: z.string(), // ISO 8601 format
  startTimestampLocal: z.string(), // ISO 8601 format
  endTimestampGmt: z.string(), // ISO 8601 format
  endTimestampLocal: z.string(), // ISO 8601 format
  totalDurationInMillis: z.number(),
});

export const UserDailySummarySchema = z.object({
  uuid: z.string(),
  userProfilePk: z.number(),
  calendarDate: z.string(), // ISO date format (YYYY-MM-DD)
  source: z.string(),
  includesWellnessData: z.boolean(),
  includesActivityData: z.boolean(),
  wellnessChronology: WellnessChronologySchema,
  movement: MovementSchema,
  calories: CaloriesSchema,
  heartRate: HeartRateSchema.optional(),
  intensityMinutes: IntensityMinutesSchema.optional(),
  stress: StressSchema.optional(),
  bodyBattery: BodyBatterySchema.optional(),
  hydration: HydrationSchema.optional(),
  respiration: RespirationSchema.optional(),
  pulseOx: PulseOxSchema.optional(),
  jetLag: z.record(z.never()).optional(),
});

export type Steps = z.infer<typeof StepsSchema>;
export type Floors = z.infer<typeof FloorsSchema>;
export type Movement = z.infer<typeof MovementSchema>;
export type Calories = z.infer<typeof CaloriesSchema>;
export type HeartRate = z.infer<typeof HeartRateSchema>;
export type IntensityMinutes = z.infer<typeof IntensityMinutesSchema>;
export type Stress = z.infer<typeof StressSchema>;
export type BodyBatteryDynamicFeedbackEvent = z.infer<typeof BodyBatteryDynamicFeedbackEventSchema>;
export type BodyBatteryActivityEvent = z.infer<typeof BodyBatteryActivityEventSchema>;
export type BodyBattery = z.infer<typeof BodyBatterySchema>;
export type Hydration = z.infer<typeof HydrationSchema>;
export type Respiration = z.infer<typeof RespirationSchema>;
export type PulseOx = z.infer<typeof PulseOxSchema>;
export type WellnessChronology = z.infer<typeof WellnessChronologySchema>;
export type UserDailySummary = z.infer<typeof UserDailySummarySchema>;

// ============================================================================
// Training Status Types
// ============================================================================

export const AcuteTrainingLoadDTOSchema = z.object({
  acwrPercent: z.number(),
  acwrStatus: z.nativeEnum(AcwrStatus),
  acwrStatusFeedback: z.nativeEnum(AcwrStatusFeedback),
  dailyTrainingLoadAcute: z.number(),
  maxTrainingLoadChronic: z.number(),
  minTrainingLoadChronic: z.number(),
  dailyTrainingLoadChronic: z.number(),
  dailyAcuteChronicWorkloadRatio: z.number(),
});

export const TrainingStatusDataSchema = z.object({
  calendarDate: z.string(), // ISO date format (YYYY-MM-DD)
  sinceDate: z.string().nullable(), // ISO date format (YYYY-MM-DD) or null
  weeklyTrainingLoad: z.number().nullable(),
  trainingStatus: z.nativeEnum(TrainingStatus),
  timestamp: z.number(), // Unix timestamp in milliseconds
  deviceId: z.number(),
  loadTunnelMin: z.number().nullable(),
  loadTunnelMax: z.number().nullable(),
  loadLevelTrend: z.number().nullable(),
  sport: z.nativeEnum(Sport),
  subSport: z.nativeEnum(SubSport),
  fitnessTrendSport: z.nativeEnum(Sport),
  fitnessTrend: z.nativeEnum(FitnessTrend),
  trainingStatusFeedbackPhrase: z.nativeEnum(TrainingStatusFeedbackPhrase),
  trainingPaused: z.boolean(),
  acuteTrainingLoadDTO: AcuteTrainingLoadDTOSchema,
  primaryTrainingDevice: z.boolean(),
});

export const RecordedDeviceSchema = z.object({
  deviceId: z.number(),
  imageURL: z.string(),
  deviceName: z.string(),
  category: z.number(),
});

export const TrainingStatusDailyScalarSchema = z.object({
  userId: z.number(),
  latestTrainingStatusData: z.record(TrainingStatusDataSchema),
  recordedDevices: z.array(RecordedDeviceSchema),
  showSelector: z.boolean(),
  lastPrimarySyncDate: z.string(), // ISO date format (YYYY-MM-DD)
});

export const TrainingStatusWeeklyScalarSchema = z.object({
  userId: z.number(),
  fromCalendarDate: z.string(), // ISO date format (YYYY-MM-DD)
  toCalendarDate: z.string(), // ISO date format (YYYY-MM-DD)
  showSelector: z.boolean(),
  recordedDevices: z.array(RecordedDeviceSchema),
  reportData: z.record(z.array(TrainingStatusDataSchema)),
});

export type AcuteTrainingLoadDTO = z.infer<typeof AcuteTrainingLoadDTOSchema>;
export type TrainingStatusData = z.infer<typeof TrainingStatusDataSchema>;
export type RecordedDevice = z.infer<typeof RecordedDeviceSchema>;
export type TrainingStatusDailyScalar = z.infer<typeof TrainingStatusDailyScalarSchema>;
export type TrainingStatusWeeklyScalar = z.infer<typeof TrainingStatusWeeklyScalarSchema>;

// ============================================================================
// Heart Rate Zone Types
// ============================================================================

export const HeartRateZoneScalarSchema = z.object({
  trainingMethod: z.nativeEnum(TrainingMethod),
  restingHeartRateUsed: z.number(),
  lactateThresholdHeartRateUsed: z.number().optional(),
  zone1Floor: z.number(),
  zone2Floor: z.number(),
  zone3Floor: z.number(),
  zone4Floor: z.number(),
  zone5Floor: z.number(),
  maxHeartRateUsed: z.number(),
  restingHrAutoUpdateUsed: z.boolean(),
  sport: z.nativeEnum(Sport),
  changeState: z.nativeEnum(ChangeState),
});

export type HeartRateZoneScalar = z.infer<typeof HeartRateZoneScalarSchema>;

// ============================================================================
// Client Configuration Types
// ============================================================================

export interface GarminConnectClientConfig {
  username: string;
  password: string;
}

export interface GarminConnectClient {
  getActivities(start?: number, limit?: number): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity>;
  getGolfActivities(page?: number, perPage?: number, locale?: string): Promise<GolfActivitiesPage>;
  getGolfScorecardDetail(scorecardId: number, locale?: string): Promise<GolfScorecardDetailWithSnapshot>;
  getGolfRounds(page?: number, perPage?: number, locale?: string): Promise<GolfRoundsPage>;
}

// OAuth 1.0 application identity (key/secret)
export interface OAuth1AppIdentity {
  key: string;
  secret: string;
}

// OAuth 1.0 Token
export interface OAuth1Token {
  oauth_token: string;
  oauth_token_secret: string;
}

// OAuth 2.0 Token (Garmin-specific response format)
export interface OAuth2Token {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  expires_at?: number;
  refresh_token_expires_at?: number;
  last_update_date?: string;
  expires_date?: string;
}
