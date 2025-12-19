/**
 * Garmin Connect client implementation
 */

import type { Activity, GarminConnectClient } from './types';

export class GarminConnectClientImpl implements GarminConnectClient {
  async getActivities(): Promise<Activity[]> {
    // Implementation here
    throw new Error('Not implemented');
  }

  async getActivity(id: string): Promise<Activity> {
    // Implementation here
    throw new Error('Not implemented');
  }
}
