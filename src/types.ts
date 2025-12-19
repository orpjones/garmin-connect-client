/**
 * Type definitions for Garmin Connect
 */

export interface Activity {
  id: string;
  name: string;
  description: string;
  duration: number; // in milliseconds
  start_date: Date;
  end_date: Date;
}

export interface GarminConnectClient {
  getActivities(): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity>;
}
