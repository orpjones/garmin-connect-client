import { DateTime } from 'luxon';

import { HttpClient } from '../http-client';
import { GarminConnectSleepClient } from '../types';
import { GarminUrls } from '../urls';

import { DailySleepData, DailySleepDataSchema } from './types/daily-sleep-data';
import { SleepStats, SleepStatsSchema } from './types/sleep-stats';

export class SleepClientImpl implements GarminConnectSleepClient {
  public constructor(
    private readonly httpClient: HttpClient,
    private readonly urls: GarminUrls
  ) {}

  public async getDailySleepData(
    date: DateTime<true> = DateTime.now(),
    nonSleepBufferMinutes: number = 60
  ): Promise<DailySleepData> {
    const url = this.urls.DAILY_SLEEP_DATA(date, nonSleepBufferMinutes);
    const response = await this.httpClient.get(url);
    return DailySleepDataSchema.parse(response);
  }

  public async getSleepStats(from: DateTime<true>, to: DateTime<true>): Promise<SleepStats> {
    const url = this.urls.SLEEP_STATS(from, to);
    const response = await this.httpClient.get(url);
    return SleepStatsSchema.parse(response);
  }
}
