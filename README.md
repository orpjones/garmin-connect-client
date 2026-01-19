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

### 1) Fetch recent scorecards with course info

```typescript
const golfActivities = await client.getGolfActivities(1, 50, 'en');

// Scorecard rounds with course metadata filled in when available.
const scorecards = golfActivities.scorecardActivities;
const recentRounds = scorecards.slice(0, 5).map(round => ({
  id: round.id,
  courseName: round.courseName,
  courseSnapshotId: round.courseSnapshotId,
  totalStrokes: round.strokes,
  holesCompleted: round.holesCompleted,
  roundPar: round.courseSummary?.par,
}));
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
