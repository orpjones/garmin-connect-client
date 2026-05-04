import { DateTime } from 'luxon';

import { HttpClient } from '../http-client';
import { GarminConnectHrvClient } from '../types';
import { GarminUrls } from '../urls';

import { DailyHrv, DailyHrvSchema } from './types/daily-hrv';

export class HrvClientImpl implements GarminConnectHrvClient {
  public constructor(
    private readonly httpClient: HttpClient,
    private readonly urls: GarminUrls
  ) {}

  public async getDailyHrv(date: DateTime<true> = DateTime.now()): Promise<DailyHrv> {
    const url = this.urls.DAILY_HRV(date);
    const response = await this.httpClient.get(url);
    return DailyHrvSchema.parse(response);
  }
}
