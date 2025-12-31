import { z } from 'zod';

import { HttpClient } from './http-client';
import type { Activity, GarminConnectClient, GarminConnectClientConfig, GolfActivitiesResponse } from './types';
import { ActivitySchema, GolfActivitiesResponseSchema } from './types';
import { GarminUrls } from './urls';

// Response schema for activities list
const ActivitiesResponseSchema = z.array(ActivitySchema);

export class GarminConnectClientImpl implements GarminConnectClient {
  private config: GarminConnectClientConfig;
  private httpClient: HttpClient;
  private urls: GarminUrls;

  private constructor(config: GarminConnectClientConfig) {
    this.config = config;
    this.urls = new GarminUrls();
    this.httpClient = new HttpClient(this.urls, config.mfaCodeProvider);
  }

  // Public constructor for testing - creates unauthenticated client
  static createUnauthenticated(config: GarminConnectClientConfig): GarminConnectClientImpl {
    return new GarminConnectClientImpl(config);
  }

  static async createAuthenticated(config: GarminConnectClientConfig): Promise<GarminConnectClientImpl> {
    const client = new GarminConnectClientImpl(config);
    await client.login();
    return client;
  }

  private async login(): Promise<void> {
    await this.httpClient.authenticate(this.config.username, this.config.password);
  }

  async getActivities(start = 0, limit = 20): Promise<Activity[]> {
    const url = this.urls.ACTIVITY_SEARCH(start, limit);
    const response = await this.httpClient.get<unknown>(url);
    return ActivitiesResponseSchema.parse(response);
  }

  async getActivity(id: string): Promise<Activity> {
    const url = this.urls.ACTIVITY_DETAIL(id);
    const response = await this.httpClient.get<unknown>(url);
    return ActivitySchema.parse(response);
  }

  async getGolfActivities(page = 1, perPage = 20, locale = 'en'): Promise<GolfActivitiesResponse> {
    const url = this.urls.GOLF_ACTIVITIES(page, perPage, locale);
    const response = await this.httpClient.get(url);
    return GolfActivitiesResponseSchema.parse(response);
  }
}
