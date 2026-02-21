# Garmin Connect

TypeScript library for reading data from Garmin Connect.

## Installation

```bash
npm install garmin-connect-client
```

## Usage

```typescript
import { createAuthContext, create } from 'garmin-connect-client';

// Step 1: Create an authentication context
const authContext = await createAuthContext({
  username: 'your-username',
  password: 'your-password',
});

// Step 2: Create authenticated client (provide MFA code if required)
const mfaCode = authContext.mfaRequired ? await getUserMfaCode() : undefined;
const client = await create(authContext, mfaCode);

// Use the client
const activities = await client.getActivities();
```

### Golf Activities

Common use cases for golf activities.

Core principles

- Domain prefix: `Golf*` keeps types grouped and searchable.
- Layer suffix: `Summary`, `Detail`, `Snapshot`, `Activity`, `Scorecard` indicate payload depth.
- Endpoint alignment: names mirror API resources (e.g., `ScorecardDetail`).
- Hole clarity: summary vs detail holes use distinct types.

Layer suffix meanings

- `Activity`: list-level items returned from activity listings; summary fields only.
- `Summary`: normalized, light-weight views derived from deeper payloads.
- `Detail`: full detail payloads from detail endpoints.
- `Snapshot`: raw course snapshot payloads as returned by snapshot endpoints.
- `Scorecard`: scorecard-specific payloads (round-level golf data).

Taxonomy

- Activities: `GolfScorecardActivity`, `GolfDrivingRangeActivity`.
- Scorecards: `GolfScorecardDetail`, `GolfScorecardHoleEntry`.
- Courses: `GolfCourseSnapshot` (snapshot payload), `GolfCourseSummary` (normalized view).
- Holes: `GolfSummaryHole` (activity list), `GolfScorecardHoleEntry` (detail payload).

### Golf data model

The golf API mixes summary activity payloads with deeper scorecard detail payloads. The exported types use naming to clarify the layer:

- `GolfScorecardActivity` is the activity list item (summary).
- `GolfSummaryHole` is the light-weight hole entry inside `GolfScorecardActivity.activityHoles`.
- `GolfScorecardDetail` is the scorecard detail payload.
- `GolfScorecardHoleEntry` is the detailed hole entry inside `GolfScorecardDetail.holes`.
- `GolfCourseSnapshot` is the raw course snapshot payload; `GolfCourseSummary` is a normalized view.

### 1) Fetch recent scorecards with course info

```typescript
const golfActivities = await client.getGolfActivities(1, 50, 'en');

// Scorecard rounds from the activity list (summary data only)
const scorecards = golfActivities.scorecardActivities;
const recentRounds = scorecards.slice(0, 5).map(round => ({
  id: round.id,
  courseName: round.courseName,
  totalStrokes: round.strokes,
  holesCompleted: round.holesCompleted,
}));

// To get detailed course info (courseSnapshotId, teeBox, rating, slope), use the detail endpoint
const firstRound = scorecards[0];
const detail = await client.getGolfScorecardDetail(firstRound.id);
console.log({
  courseSnapshotId: detail.scorecard.courseSnapshotId,
  teeBox: detail.scorecard.teeBox,
  rating: detail.scorecard.teeBoxRating,
  slope: detail.scorecard.teeBoxSlope,
  courseSnapshot: detail.courseSnapshot, // Full course details if available
});
```

### 2) Filter to full 18-hole rounds

```typescript
const golfActivities = await client.getGolfActivities(1, 100, 'en');
const fullRounds = golfActivities.scorecardActivities.filter(round => round.holesCompleted === 18);
```

### 3) Group rounds by course

```typescript
const golfActivities = await client.getGolfActivities(1, 200, 'en');
const roundsByCourse = new Map<string, number[]>();

for (const round of golfActivities.scorecardActivities) {
  const key = round.courseName;
  const existing = roundsByCourse.get(key) ?? [];
  roundsByCourse.set(key, [...existing, round.strokes]);
}
```

### 4) Get detailed scorecard with hole-by-hole data

```typescript
const golfActivities = await client.getGolfActivities(1, 20, 'en');
const firstActivity = golfActivities.scorecardActivities[0];

// Fetch full scorecard detail (includes detailed hole data, tee box info, course snapshot)
const detail = await client.getGolfScorecardDetail(firstActivity.id);

// Access detailed hole information
for (const hole of detail.scorecard.holes) {
  console.log({
    hole: hole.number,
    strokes: hole.strokes,
    putts: hole.putts,
    penalties: hole.penalties,
    handicapScore: hole.handicapScore,
  });
}

// Access course snapshot if available
if (detail.courseSnapshot) {
  console.log({
    courseName: detail.courseSnapshot.name,
    par: detail.courseSnapshot.roundPar,
    holeCount: detail.courseSnapshot.holePars.length,
    tees: detail.courseSnapshot.tees,
  });
}
```

### 5) Get golf rounds with combined data (convenience method)

`getGolfRounds()` is a convenience method that combines `getGolfActivities()` and `getGolfScorecardDetail()` to provide a single, enriched dataset. Instead of manually fetching activities and then scorecard details for each round, this method does both automatically.

**When to use `getGolfRounds()`:**
- You need combined data (course rating, slope, par, tee box, hole-by-hole scores, start time) in one call
- You want to avoid making multiple API calls per round
- You're building a round history or statistics view

**When to use `getGolfActivities()` + `getGolfScorecardDetail()`:**
- You only need summary data (course name, total strokes, holes completed)
- You want to fetch details selectively (e.g., only for specific rounds)
- You need more control over the data fetching process

```typescript
// Convenience method: automatically combines activities and scorecard details
const roundsPage = await client.getGolfRounds(1, 20, 'en');

for (const round of roundsPage.rounds) {
  console.log({
    courseId: round.courseId,
    courseName: round.courseName,
    startTime: round.startTime, // ISO 8601 timestamp
    totalScore: round.totalScore,
    courseRating: round.courseRating,
    courseSlope: round.courseSlope,
    coursePar: round.coursePar,
    tees: round.tees,
    holesPlayed: round.holesPlayed,
    perHoleScore: round.perHoleScore, // Array of { holeNumber, strokes? }
  });
}

// Equivalent manual approach (more API calls):
const activitiesPage = await client.getGolfActivities(1, 20, 'en');
const rounds = await Promise.all(
  activitiesPage.scorecardActivities.map(async (activity) => {
    const detail = await client.getGolfScorecardDetail(activity.id);
    // Manually combine data from activity and detail...
  })
);
```

### Sleep

The sleep client can be used to fetch various sleep-related data points.

#### Get daily sleep data

```typescript
const dailySleepData = await client.sleep.getDailySleepData(DateTime.now());

console.log(`Your overall sleep score for today is: ${dailySleepData.dailySleepDTO.sleepScores.overall.value}`);
```

#### Get sleep stats over a date range

```typescript
const sleepStats = await client.sleep.getSleepStats(
  DateTime.now().minus({ days: 7 }),
  DateTime.now().now()
);

console.log(`Your average sleep score over the last 7 days was: ${sleepStats.overallStates.averageSleepScore}`);
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to contribute to this project.

### Quick Start

```bash
npm install
npm run build
```

### Development Commands

```bash
npm run watch   # Watch mode for development
npm run clean   # Clean build artifacts
```

## Testing

```bash
npm test          # Run tests in watch mode
npm run test:run  # Run tests once
npm run test:ui   # Open Vitest UI
npm run test:coverage  # Generate coverage report
```

## Schema Reference

All responses Garmin should ƒollow the (mostly complete) Zod schemas in `src/types.ts`.

## License

MIT
