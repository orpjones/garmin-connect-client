# Garmin Connect

TypeScript library for reading data from Garmin Connect.

## Installation

```bash
npm install garmin-connect-client
```

## Development

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

## Testing

```bash
npm test          # Run tests in watch mode
npm run test:run  # Run tests once
npm run test:ui   # Open Vitest UI
npm run test:coverage  # Generate coverage report
```

## License

MIT


