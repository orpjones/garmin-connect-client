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

## Contributing

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Clean

```bash
npm run clean
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
