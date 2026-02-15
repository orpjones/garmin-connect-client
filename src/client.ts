import { z } from 'zod';

import { AuthContext } from './auth-context';
import { AuthenticationService } from './authentication-service';
import { AuthenticationContextError, MfaCodeError } from './errors';
import { HttpClient } from './http-client';
import type {
  Activity,
  GarminConnectClient,
  GolfActivitiesPage,
  GolfScorecardDetailWithSnapshot,
  GolfRound,
  GolfRoundsPage,
} from './types';
import { ActivitySchema, GolfActivitiesPageSchema, GolfScorecardDetailsResponseSchema } from './types';
import { GarminUrls } from './urls';

// Response schema for activities list
const ActivitiesResponseSchema = z.array(ActivitySchema);

export class GarminConnectClientImpl implements GarminConnectClient {
  private httpClient: HttpClient;
  private urls: GarminUrls;

  private constructor(httpClient: HttpClient, urls: GarminUrls) {
    this.httpClient = httpClient;
    this.urls = urls;
  }

  static async create(context: AuthContext, urls: GarminUrls, mfaCode?: string): Promise<GarminConnectClient> {
    const cookies = context.getCookies();

    let httpClient: HttpClient;
    if (context.mfaRequired) {
      if (!mfaCode) {
        throw new MfaCodeError('MFA code is required when mfaRequired is true');
      }
      if (!context.mfaMethod) {
        throw new AuthenticationContextError('MFA method not found in auth context');
      }
      // Complete MFA authentication
      httpClient = await AuthenticationService.completeAuthentication(urls, cookies, {
        type: 'mfa',
        mfaCode,
        mfaMethod: context.mfaMethod,
      });
    } else {
      // No MFA - use the ticket we already have
      const ticket = context.getTicket();
      if (!ticket) {
        throw new AuthenticationContextError('Ticket not found in auth context');
      }
      httpClient = await AuthenticationService.completeAuthentication(urls, cookies, {
        type: 'ticket',
        ticket,
      });
    }

    return new GarminConnectClientImpl(httpClient, urls);
  }

  // Public constructor for testing - creates unauthenticated client
  static createUnauthenticated(): GarminConnectClientImpl {
    const urls = new GarminUrls();
    const httpClient = new HttpClient(urls);
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

        // Extract distance if available from course snapshot
        // Note: Distance might not always be available in the API response
        const distance = undefined; // Could be calculated from hole distances if available

        return {
          scorecardId: activity.id,
          courseName: activity.courseName,
          courseRating: detail.scorecard.teeBoxRating ?? 0,
          courseSlope: detail.scorecard.teeBoxSlope ?? 0,
          coursePar: coursePar ?? 0, // Default to 0 if not available
          holesPlayed: activity.holesCompleted,
          totalScore: activity.strokes,
          tees: detail.scorecard.teeBox ?? '',
          distance,
          startTime: detail.scorecard.startTime,
          perHoleScore: detail.scorecard.holes.map(hole => ({
            holeNumber: hole.number,
            strokes: hole.strokes,
          })),
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
