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

### Basic Usage

```typescript
import { create, type GarminConnectClient } from 'garmin-connect-client';

// Create an authenticated client
const client: GarminConnectClient = await create({
  username: 'your-username',
  password: 'your-password',
});

// Get activities
const activities = await client.getActivities();
```

### With MFA

If your account uses Multi-Factor Authentication (MFA), provide an `mfaCodeProvider`:

```typescript
import { create } from 'garmin-connect-client';

const client = await create({
  username: 'your-username',
  password: 'your-password',
  mfaCodeProvider: async () => {
    // Return the MFA code
    return '123456';
  },
});
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


