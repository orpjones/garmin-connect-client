/**
 * Main entry point for the Garmin Connect library
 * This file exports the public API - both types and implementations
 */

// Export types (for TypeScript users who need type information)
export type { Activity, GarminConnectClient } from './types';

// Export implementations (the actual classes/functions users will use)
export { GarminConnectClientImpl } from './client';
