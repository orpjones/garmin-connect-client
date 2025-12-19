# Garmin Connect

TypeScript library for interacting with Garmin Connect.

## Installation

```bash
npm install garmin-connect
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
import { GarminConnectClientImpl, type GarminConnectClient } from 'garmin-connect';

const client: GarminConnectClient = new GarminConnectClientImpl();
const activities = await client.getActivities();
```

## Testing

```bash
npm test          # Run tests in watch mode
npm run test:run  # Run tests once
npm run test:ui   # Open Vitest UI
npm run test:coverage  # Generate coverage report
```

The interface pattern makes testing easy - you can create mock implementations that satisfy the `GarminConnectClient` interface without needing the real API.

## License

MIT


