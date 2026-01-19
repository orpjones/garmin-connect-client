import { z } from 'zod';

import { AuthContext } from './auth-context';
import { AuthenticationService } from './authentication-service';
import { AuthenticationContextError, MfaCodeError } from './errors';
import { HttpClient } from './http-client';
import type {
  Activity,
  GarminConnectClient,
  GolfActivitiesPage,
  GolfCourseDetail,
  GolfCoursesPage,
  GolfCourseSummary,
} from './types';
import {
  ActivitySchema,
  GolfActivitiesPageSchema,
  GolfCourseDetailsResponseSchema,
  GolfCoursesPageSchema,
} from './types';
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
    const activities = GolfActivitiesPageSchema.parse(response);

    // Fetch the user's course list to map course names to IDs.
    const courses = await this.getGolfCourses(10_000, locale);
    const courseByName = new Map<string, (typeof courses.rounds)[number]>();

    // Prefer the most recently played course when duplicate names exist.
    for (const course of courses.rounds) {
      const existing = courseByName.get(course.name);
      if (!existing || course.lastPlayedTime > existing.lastPlayedTime) {
        courseByName.set(course.name, course);
      }
    }

    // Enrich scorecards with course IDs based on the course list.
    const scorecardActivitiesWithIds = activities.scorecardActivities.map(activity => {
      const course = courseByName.get(activity.courseName);
      if (!course) {
        return activity;
      }

      return {
        ...activity,
        courseSnapshotId: course.courseSnapshotId,
        courseGlobalId: course.courseGlobalId,
      };
    });

    // Fetch course summaries for each unique course snapshot.
    const snapshotIds = [
      ...new Set(
        scorecardActivitiesWithIds
          .map(activity => activity.courseSnapshotId)
          .filter((courseSnapshotId): courseSnapshotId is number => typeof courseSnapshotId === 'number')
      ),
    ];
    const summariesBySnapshotId = new Map<number, GolfCourseSummary>();

    if (snapshotIds.length > 0) {
      const summaries = await this.getGolfCourseSummaries(snapshotIds, locale);
      for (const summary of summaries) {
        summariesBySnapshotId.set(summary.courseSnapshotId, summary);
      }
    }

    // Attach course summaries to each scorecard where available.
    const scorecardActivities = scorecardActivitiesWithIds.map(activity => {
      if (typeof activity.courseSnapshotId !== 'number') {
        return activity;
      }

      const courseSummary = summariesBySnapshotId.get(activity.courseSnapshotId);
      if (!courseSummary) {
        return activity;
      }

      return {
        ...activity,
        courseSummary,
      };
    });

    return {
      ...activities,
      scorecardActivities,
    };
  }

  // Returns the user's course list (aka course "rounds" list) for name/ID lookups.
  async getGolfCourses(perPage = 10_000, locale = 'en'): Promise<GolfCoursesPage> {
    const url = this.urls.GOLF_COURSE_SNAPSHOTS(perPage, locale);
    const response = await this.httpClient.get(url);
    return GolfCoursesPageSchema.parse(response);
  }

  // Internal helper to fetch full course snapshot detail objects.
  private async getGolfCourseSnapshotDetails(courseSnapshotIds: number[], locale = 'en'): Promise<GolfCourseDetail[]> {
    if (courseSnapshotIds.length === 0) {
      return [];
    }

    if (courseSnapshotIds.length === 1) {
      const url = this.urls.GOLF_COURSE_SNAPSHOT_DETAILS(courseSnapshotIds, locale);
      const response = await this.httpClient.get(url);
      return GolfCourseDetailsResponseSchema.parse(response);
    }

    const uniqueIds = [...new Set(courseSnapshotIds)];
    const detailLists = await Promise.all(
      uniqueIds.map(courseSnapshotId => this.getGolfCourseSnapshotDetails([courseSnapshotId], locale))
    );
    return detailLists.flat();
  }

  // Internal helper to normalize course snapshot details into summary data.
  private async getGolfCourseSummaries(courseSnapshotIds: number[], locale = 'en'): Promise<GolfCourseSummary[]> {
    const details = await this.getGolfCourseSnapshotDetails(courseSnapshotIds, locale);

    return details.map(detail => {
      // Optional distance fields are not in all course snapshot payloads.
      const detailAny = detail as Record<string, unknown>;
      const distanceMeters =
        typeof detailAny.distanceMeters === 'number'
          ? detailAny.distanceMeters
          : typeof detailAny.distance === 'number'
            ? detailAny.distance
            : undefined;

      return {
        courseGlobalId: detail.courseGlobalId,
        courseSnapshotId: detail.courseSnapshotId,
        name: detail.name,
        par: detail.roundPar,
        holeCount: detail.holePars.length,
        tees: detail.tees,
        distanceMeters,
      };
    });
  }
}
