import { z } from 'zod';

import { HttpClient } from './http-client';
import { SleepClientImpl } from './sleep/client';
import type {
  Activity,
  GarminConnectClient,
  GolfActivitiesPage,
  GolfScorecardDetailWithSnapshot,
  GolfRound,
  GolfRoundsPage,
  GarminConnectSleepClient,
  PersistedSession,
} from './types';
import { ActivitySchema, GolfActivitiesPageSchema, GolfScorecardDetailsResponseSchema } from './types';
import { GarminUrls } from './urls';

// Response schema for activities list
const ActivitiesResponseSchema = z.array(ActivitySchema);

export class GarminConnectClientImpl implements GarminConnectClient {
  private httpClient: HttpClient;
  private urls: GarminUrls;

  private sleepClient: GarminConnectSleepClient;
  public get sleep() {
    return this.sleepClient;
  }

  private constructor(httpClient: HttpClient, urls: GarminUrls) {
    this.httpClient = httpClient;
    this.urls = urls;

    this.sleepClient = new SleepClientImpl(this.httpClient, this.urls);
  }

  // Wraps a fully-authenticated HttpClient in a GarminConnectClient.
  static fromHttpClient(httpClient: HttpClient, urls: GarminUrls): GarminConnectClientImpl {
    return new GarminConnectClientImpl(httpClient, urls);
  }

  // Public constructor for testing - creates unauthenticated client
  static createUnauthenticated(): GarminConnectClientImpl {
    const urls = new GarminUrls();
    const httpClient = new HttpClient(urls);
    return new GarminConnectClientImpl(httpClient, urls);
  }

  // Creates a client from persisted session data (no network calls)
  static fromSession(session: PersistedSession): GarminConnectClientImpl {
    const urls = new GarminUrls();
    const httpClient = new HttpClient(urls, session);
    return new GarminConnectClientImpl(httpClient, urls);
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

  async getGolfActivities(page = 1, perPage = 20, locale = 'en'): Promise<GolfActivitiesPage> {
    const url = this.urls.GOLF_ACTIVITIES(page, perPage, locale);
    const response = await this.httpClient.get(url);
    return GolfActivitiesPageSchema.parse(response);
  }

  async getGolfScorecardDetail(scorecardId: number, locale = 'en'): Promise<GolfScorecardDetailWithSnapshot> {
    const url = this.urls.GOLF_SCORECARD_DETAILS(scorecardId, locale);
    const response = await this.httpClient.get(url);
    const details = GolfScorecardDetailsResponseSchema.parse(response);

    const detail = details.scorecardDetails[0];
    const snapshot = detail.scorecard.courseSnapshotId
      ? details.courseSnapshots.find(
          courseSnapshot => courseSnapshot.courseSnapshotId === detail.scorecard.courseSnapshotId
        )
      : undefined;

    return {
      scorecard: detail.scorecard,
      courseSnapshot: snapshot,
    };
  }

  onSessionUpdate(callback: (session: PersistedSession) => void | Promise<void>): void {
    this.httpClient.setSessionUpdateCallback(callback);
  }

  getSession(): PersistedSession {
    return this.httpClient.getSession();
  }

  async getGolfRounds(page = 1, perPage = 20, locale = 'en'): Promise<GolfRoundsPage> {
    // Fetch the activities page
    const activitiesPage = await this.getGolfActivities(page, perPage, locale);

    // Fetch detailed scorecard information for each activity
    const rounds: GolfRound[] = await Promise.all(
      activitiesPage.scorecardActivities.map(async activity => {
        const detail = await this.getGolfScorecardDetail(activity.id, locale);

        // Extract course par from snapshot, fallback to calculating from holePars string
        let coursePar = detail.courseSnapshot?.roundPar;
        if (!coursePar && detail.courseSnapshot?.holePars) {
          // Calculate par from holePars string (e.g., "454344354445353434")
          coursePar = [...detail.courseSnapshot.holePars]
            .map(par => Number.parseInt(par, 10))
            .reduce((sum, par) => sum + par, 0);
        }

        return {
          scorecardId: activity.id,
          courseId: detail.scorecard.courseGlobalId,
          courseName: activity.courseName,
          courseRating: detail.scorecard.teeBoxRating,
          courseSlope: detail.scorecard.teeBoxSlope,
          coursePar,
          holesPlayed: activity.holesCompleted,
          totalScore: activity.strokes,
          tees: detail.scorecard.teeBox,
          startTime: detail.scorecard.startTime,
          perHoleScore: detail.scorecard.holes.map(hole => {
            const par = detail.courseSnapshot?.holePars
              ? Number.parseInt(detail.courseSnapshot.holePars[hole.number - 1], 10)
              : undefined;
            return {
              holeNumber: hole.number,
              par: Number.isNaN(par) ? undefined : par,
              strokes: hole.strokes,
            };
          }),
        };
      })
    );

    return {
      pageNumber: activitiesPage.pageNumber,
      rowsPerPage: activitiesPage.rowsPerPage,
      hasNextPage: activitiesPage.hasNextPage,
      rounds,
    };
  }
}
