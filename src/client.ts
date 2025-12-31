import { z } from 'zod';
import { NotAuthenticatedError } from './errors';
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

  static async createAuthenticated(config: GarminConnectClientConfig): Promise<GarminConnectClientImpl> {
    const client = new GarminConnectClientImpl(config);
    await client.login();
    return client;
  }

  private async login(): Promise<void> {
    await this.httpClient.authenticate(this.config.username, this.config.password);
  }

  // Checks if the client is authenticated by delegating to HttpClient
  // This ensures the authentication state is always in sync with token state
  private isAuthenticated(): boolean {
    return this.httpClient.isAuthenticated();
  }

  async getActivities(start = 0, limit = 20): Promise<Activity[]> {
    if (!this.isAuthenticated()) {
      throw new NotAuthenticatedError();
    }

    const url = this.urls.ACTIVITY_SEARCH(start, limit);
    const response = await this.httpClient.get<unknown>(url);
    return ActivitiesResponseSchema.parse(response);
  }

  async getActivity(id: string): Promise<Activity> {
    if (!this.isAuthenticated()) {
      throw new NotAuthenticatedError();
    }

    const url = this.urls.ACTIVITY_DETAIL(id);
    const response = await this.httpClient.get<unknown>(url);
    return ActivitySchema.parse(response);
  }

  async getGolfActivities(page = 1, perPage = 20, locale = 'en'): Promise<GolfActivitiesResponse> {
    if (!this.isAuthenticated()) {
      throw new NotAuthenticatedError();
    }

    const url = this.urls.GOLF_ACTIVITIES(page, perPage, locale);
    const response = await this.httpClient.get(url);
    return GolfActivitiesResponseSchema.parse(response);
  }
}
