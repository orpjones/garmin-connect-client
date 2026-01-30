import { DateTime } from 'luxon';

import { HttpClient } from '../http-client';
import { GarminConnectSleepClient } from '../types';
import { GarminUrls } from '../urls';

import { DailySleepData, DailySleepDataSchema } from './types/daily-sleep-data';
import { SleepStats, SleepStatsSchema } from './types/sleep-stats';

export class SleepClientImpl implements GarminConnectSleepClient {
  private readonly baseUrl: string;

  public constructor(
    private readonly httpClient: HttpClient,
    urls: GarminUrls
  ) {
    this.baseUrl = `${urls.CONNECT_API}/sleep-service`;
  }

  public async getDailySleepData(
    date: DateTime<true> = DateTime.now(),
    nonSleepBufferMinutes: number = 60
  ): Promise<DailySleepData> {
    const url = `${this.baseUrl}/sleep/dailySleepData?date=${date.toUTC().toISODate()}&nonSleepBufferMinutes=${nonSleepBufferMinutes}`;
    const response = await this.httpClient.get(url);
    return DailySleepDataSchema.parse(response);
  }

  public async getSleepStats(from: DateTime<true>, to: DateTime<true>): Promise<SleepStats> {
    const url = `${this.baseUrl}/stats/sleep/daily/${from.toUTC().toISODate()}/${to.toUTC().toISODate()}`;
    const response = await this.httpClient.get(url);
    return SleepStatsSchema.parse(response);
  }
}
