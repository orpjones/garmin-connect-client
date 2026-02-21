// Functional tests for Garmin Connect client
//
// SETUP INSTRUCTIONS:
// Create a `.env` file in the project root with the following variables:
//    GARMIN_USERNAME=your-email@example.com
//    GARMIN_PASSWORD=your-password
//    GARMIN_MFA_USERNAME=mfa-email@example.com
//    GARMIN_MFA_PASSWORD=mfa-password
//
// NOTE: The MFA test requires console input and is automatically skipped when CI=true
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'node:path';

import { config } from 'dotenv';
import { DateTime } from 'luxon';
import { beforeAll, describe, expect, it } from 'vitest';

import { GarminConnectClientImpl } from './client';
import { InvalidCredentialsError, MfaCodeInvalidError, NotAuthenticatedError } from './errors';
import type { GarminConnectClient } from './types';

import { create, createAuthContext } from './index';

// Environment variables - loaded in beforeAll hook
let GARMIN_USERNAME: string | undefined;
let GARMIN_PASSWORD: string | undefined;
let GARMIN_MFA_USERNAME: string | undefined;
let GARMIN_MFA_PASSWORD: string | undefined;
// Check CI status immediately (before describe blocks are registered)
const IS_CI: boolean = process.env.CI === 'true' || process.env.CI === '1';
const shouldRunInteractiveMFATests: boolean = !IS_CI; // Interactive MFA tests require user input and should be skipped in CI

// Shared authenticated clients - created by first test, reused by subsequent tests
let mfaClient: GarminConnectClient | undefined;
let basicClient: GarminConnectClient | undefined;

// Helper function to validate basic credentials are set
function requireBasicCredentials(): void {
  if (!GARMIN_USERNAME || !GARMIN_PASSWORD) {
    throw new Error('GARMIN_USERNAME and GARMIN_PASSWORD must be set as environment variables or in .env file');
  }
}

// Helper function to validate MFA credentials are set
function requireMfaCredentials(): void {
  if (!GARMIN_MFA_USERNAME || !GARMIN_MFA_PASSWORD) {
    throw new Error('GARMIN_MFA_USERNAME and GARMIN_MFA_PASSWORD must be set as environment variables or in .env file');
  }
}

// Helper to read MFA code by opening a temp file in the default editor
// User edits the file, saves it, and we read the code
function readMfaCodeFromConsole(): Promise<string> {
  return new Promise((resolve, reject) => {
    const temporaryFile = path.join(os.tmpdir(), `garmin-mfa-${Date.now()}-${Math.random().toString(36).slice(7)}.txt`);
    fs.writeFileSync(temporaryFile, 'Enter your MFA code below, then save and close this file:\n\n', 'utf8');

    const initialMtime = fs.statSync(temporaryFile).mtimeMs;
    const maxWaitTime = 600_000; // 10 minutes
    const startTime = Date.now();

    // Platform-specific editor commands
    const editorCommand =
      process.platform === 'darwin'
        ? { command: 'open', args: ['-t', temporaryFile] }
        : process.platform === 'win32'
          ? { command: 'cmd', args: ['/c', 'start', 'notepad', temporaryFile] }
          : { command: 'xdg-open', args: [temporaryFile] };

    spawn(editorCommand.command, editorCommand.args, {
      detached: true,
      stdio: 'ignore',
    }).on('error', (error: Error) => reject(new Error(`Failed to open editor: ${error.message}`)));

    // Cleanup helper
    const cleanup = () => {
      try {
        if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile);
      } catch {
        // Ignore cleanup errors
      }
    };

    // Poll for file changes
    const interval = setInterval(() => {
      try {
        if (!fs.existsSync(temporaryFile)) {
          clearInterval(interval);
          cleanup();
          reject(new Error('MFA input file was deleted'));
          return;
        }

        const stats = fs.statSync(temporaryFile);
        const content = fs.readFileSync(temporaryFile, 'utf8');
        const code = content.replace(/enter your mfa code.*\n\n?/i, '').trim();

        if (stats.mtimeMs > initialMtime && code) {
          clearInterval(interval);
          cleanup();
          resolve(code);
        } else if (Date.now() - startTime > maxWaitTime) {
          clearInterval(interval);
          cleanup();
          reject(new Error('Timeout waiting for MFA code input'));
        }
      } catch (error) {
        clearInterval(interval);
        cleanup();
        reject(new Error(`Error reading MFA code file: ${error instanceof Error ? error.message : String(error)}`));
      }
    }, 500);
  });
}

async function getAuthenticatedMfaClient(): Promise<GarminConnectClient> {
  if (!mfaClient) {
    const authContext = await createAuthContext({
      username: GARMIN_MFA_USERNAME!,
      password: GARMIN_MFA_PASSWORD!,
    });

    if (!authContext.mfaRequired) {
      throw new Error('MFA is not required for these credentials; cannot run MFA tests');
    }

    const mfaCode = await readMfaCodeFromConsole();
    mfaClient = await create(authContext, mfaCode);
  }
  return mfaClient;
}

async function getAuthenticatedBasicClient(): Promise<GarminConnectClient> {
  if (!basicClient) {
    const authContext = await createAuthContext({
      username: GARMIN_USERNAME!,
      password: GARMIN_PASSWORD!,
    });
    basicClient = await create(authContext);
  }
  return basicClient;
}

// Test suite definitions - makes it easier to add/modify tests
// These can be reused across different client types

// Test implementation functions - extract the test logic to be reused
// These return the test implementation functions that can be called in it() blocks

function testGetActivitiesImpl(getClient: () => GarminConnectClient) {
  return {
    shouldRetrieveListOfActivities: async () => {
      const client = getClient();
      const activities = await client.getActivities();

      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
    },

    shouldSupportPagination: async () => {
      const client = getClient();
      // Get first page
      const firstPage = await client.getActivities(0, 5);
      expect(firstPage).toBeDefined();
      expect(Array.isArray(firstPage)).toBe(true);
      expect(firstPage.length).toBeLessThanOrEqual(5);

      // Get second page if there are more than 5 activities
      if (firstPage.length === 5) {
        const secondPage = await client.getActivities(5, 5);
        expect(secondPage).toBeDefined();
        expect(Array.isArray(secondPage)).toBe(true);

        // Activities should be different
        if (secondPage.length > 0 && firstPage.length > 0) {
          expect(firstPage[0].activityId).not.toBe(secondPage[0].activityId);
        }
      }
    },

    shouldUseDefaultPaginationValues: async () => {
      const client = getClient();
      const activities = await client.getActivities();

      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      // Default limit is 20
      expect(activities.length).toBeLessThanOrEqual(20);
    },
  };
}

function testGolfActivitiesImpl(getClient: () => GarminConnectClient) {
  return {
    shouldRetrieveGolfActivities: async () => {
      const client = getClient();
      const golfActivities = await client.getGolfActivities();

      expect(golfActivities).toBeDefined();
      expect(golfActivities.scorecardActivities.length).toBeGreaterThan(0);

      // Activity list does not include teeBox, teeBoxRating, or teeBoxSlope
      // These fields are only available via getGolfScorecardDetail()
      for (const activity of golfActivities.scorecardActivities) {
        expect(activity.id).toBeDefined();
        expect(activity.courseName).toBeDefined();
        expect(activity.strokes).toBeDefined();
        // Verify rating/slope are NOT in activity list
        expect(activity).not.toHaveProperty('teeBoxRating');
        expect(activity).not.toHaveProperty('teeBoxSlope');
        expect(activity).not.toHaveProperty('teeBox');
      }

      // To get rating and slope, use the detail endpoint
      if (golfActivities.scorecardActivities.length > 0) {
        const firstActivity = golfActivities.scorecardActivities[0];
        const detail = await client.getGolfScorecardDetail(firstActivity.id);

        expect(detail.scorecard.teeBoxRating).toBeDefined();
        expect(detail.scorecard.teeBoxSlope).toBeDefined();
        expect(detail.scorecard.teeBox).toBeDefined();
        expect(typeof detail.scorecard.teeBoxRating).toBe('number');
        expect(typeof detail.scorecard.teeBoxSlope).toBe('number');
        expect(detail.scorecard.teeBoxRating).toBeGreaterThan(0);
        expect(detail.scorecard.teeBoxSlope).toBeGreaterThan(0);
        // Typical rating range: 60-80, typical slope range: 55-155
        expect(detail.scorecard.teeBoxRating).toBeLessThan(100);
        expect(detail.scorecard.teeBoxSlope).toBeLessThan(200);
      }
    },

    shouldSupportPaginationForGolfActivities: async () => {
      const client = getClient();
      // Get first page
      const firstPage = await client.getGolfActivities(1, 5);
      expect(firstPage.pageNumber).toBe(1);
      expect(firstPage.rowsPerPage).toBe(5);

      // Get second page if there are more activities
      if (firstPage.hasNextPage) {
        const secondPage = await client.getGolfActivities(2, 5);
        expect(secondPage.pageNumber).toBe(2);
        expect(secondPage.rowsPerPage).toBe(5);

        // Activities should be different if both pages have data
        if (secondPage.scorecardActivities.length > 0 && firstPage.scorecardActivities.length > 0) {
          expect(firstPage.scorecardActivities[0].id).not.toBe(secondPage.scorecardActivities[0].id);
        }
      }
    },

    shouldUseDefaultPaginationValuesForGolfActivities: async () => {
      const client = getClient();
      const golfActivities = await client.getGolfActivities();

      expect(golfActivities.pageNumber).toBe(1);
      // Default perPage is 20
      expect(golfActivities.rowsPerPage).toBe(20);
    },
  };
}

function testGolfRoundsImpl(getClient: () => GarminConnectClient) {
  return {
    shouldRetrieveGolfRounds: async () => {
      const client = getClient();
      const roundsPage = await client.getGolfRounds(1, 1000);

      expect(roundsPage.rounds).toBeDefined();
      expect(Array.isArray(roundsPage.rounds)).toBe(true);
      expect(roundsPage.rounds.length).toBeGreaterThan(0);

      for (const round of roundsPage.rounds) {
        expect(round.courseId).toBeDefined();
        expect(typeof round.courseId).toBe('number');
        expect(round.courseName).toBeDefined();
        expect(round.startTime).toBeDefined();
        expect(typeof round.startTime).toBe('string');
        expect(round.perHoleScore).toBeDefined();
        expect(Array.isArray(round.perHoleScore)).toBe(true);
        for (const hole of round.perHoleScore) {
          expect(typeof hole.holeNumber).toBe('number');
          expect(hole.holeNumber).toBeGreaterThanOrEqual(1);
          if (hole.par !== undefined) {
            expect(typeof hole.par).toBe('number');
            expect([3, 4, 5]).toContain(hole.par);
          }
          if (hole.strokes !== undefined) expect(typeof hole.strokes).toBe('number');
        }

        // courseRating, courseSlope, coursePar, tees are optional (may be omitted for practice/incomplete rounds)
        if (round.courseRating !== undefined) expect(typeof round.courseRating).toBe('number');
        if (round.courseSlope !== undefined) expect(typeof round.courseSlope).toBe('number');
        if (round.coursePar !== undefined) expect(typeof round.coursePar).toBe('number');
        if (round.tees !== undefined) expect(typeof round.tees).toBe('string');
      }
    },

    shouldSupportPaginationForGolfRounds: async () => {
      const client = getClient();
      // Get first page
      const firstPage = await client.getGolfRounds(1, 5);
      expect(firstPage.pageNumber).toBe(1);
      expect(firstPage.rowsPerPage).toBe(5);

      // Get second page if there are more rounds
      if (firstPage.hasNextPage) {
        const secondPage = await client.getGolfRounds(2, 1000);
        expect(secondPage.pageNumber).toBe(2);
        expect(secondPage.rowsPerPage).toBe(1000);

        // Rounds should be different if both pages have data
        if (secondPage.rounds.length > 0 && firstPage.rounds.length > 0) {
          expect(firstPage.rounds[0].scorecardId).not.toBe(secondPage.rounds[0].scorecardId);
        }
      }
    },
  };
}

function testGetDailySleepData(getClient: () => GarminConnectClient) {
  return {
    shouldRetrieveDailySleepData: async () => {
      const client = getClient();
      const sleepData = await client.sleep.getDailySleepData();
      expect(sleepData).toBeDefined();
    },
  };
}

function testGetSleepStats(getClient: () => GarminConnectClient) {
  return {
    shouldRetrieveSleepStats: async () => {
      const client = getClient();
      const fromDate = DateTime.utc().minus({ days: 7 });
      const toDate = DateTime.utc();
      const sleepStats = await client.sleep.getSleepStats(fromDate, toDate);
      expect(sleepStats).toBeDefined();
    },
  };
}

describe('GarminConnectClient', () => {
  beforeAll(() => {
    // Load .env file from project root
    // Use process.cwd() which should be the project root when running tests
    const environmentPath = path.resolve(process.cwd(), '.env');
    const result = config({ path: environmentPath });
    if (result.error && fs.existsSync(environmentPath)) {
      console.warn(`Warning: Failed to load .env file: ${result.error.message}`);
    }

    // Load environment variables
    GARMIN_USERNAME = process.env.GARMIN_USERNAME;
    GARMIN_PASSWORD = process.env.GARMIN_PASSWORD;
    GARMIN_MFA_USERNAME = process.env.GARMIN_MFA_USERNAME;
    GARMIN_MFA_PASSWORD = process.env.GARMIN_MFA_PASSWORD;

    // Reset shared clients at the start of each test run
    mfaClient = undefined;
    basicClient = undefined;
  });

  describe('create and authenticate (Basic Login - No MFA)', () => {
    beforeAll(() => {
      // Fail fast if credentials are missing
      requireBasicCredentials();
    });

    it('should create and authenticate a client instance', async () => {
      const authContext = await createAuthContext({
        username: GARMIN_USERNAME!,
        password: GARMIN_PASSWORD!,
      });
      await create(authContext);
    });

    it('should throw an error for invalid password', async () => {
      await expect(
        createAuthContext({
          username: GARMIN_USERNAME!,
          password: 'invalid-password',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw an error for invalid username', async () => {
      await expect(
        createAuthContext({
          username: 'invalid-username@example.com',
          password: 'some-password',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw an error for invalid password (generic test)', async () => {
      // This test doesn't require real credentials - it tests error handling
      await expect(
        createAuthContext({
          username: 'test@example.com',
          password: 'invalid-password',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    // Run tests with basic client
    describe('with authenticated basic client', () => {
      beforeAll(async () => {
        await getAuthenticatedBasicClient();
      });

      describe('getActivities', () => {
        const tests = testGetActivitiesImpl(() => basicClient!);

        it('should retrieve a list of activities', tests.shouldRetrieveListOfActivities);

        it('should support pagination with start and limit parameters', tests.shouldSupportPagination);

        it('should use default pagination values when not specified', tests.shouldUseDefaultPaginationValues);
      });

      describe('golf activities', () => {
        const tests = testGolfActivitiesImpl(() => basicClient!);

        it(
          'should retrieve golf activities (rating and slope available via detail endpoint)',
          tests.shouldRetrieveGolfActivities
        );

        it(
          'should support pagination with page and perPage parameters for golf activities',
          tests.shouldSupportPaginationForGolfActivities
        );

        it(
          'should use default pagination values when not specified for golf activities',
          tests.shouldUseDefaultPaginationValuesForGolfActivities
        );
      });

      describe('golf rounds', () => {
        const tests = testGolfRoundsImpl(() => basicClient!);

        it(
          'should retrieve golf rounds with combined data from activities and detail endpoints',
          tests.shouldRetrieveGolfRounds
        );

        it(
          'should support pagination with page and perPage parameters for golf rounds',
          tests.shouldSupportPaginationForGolfRounds
        );
      });

      describe('sleep', () => {
        describe('getDailySleepData', () => {
          const tests = testGetDailySleepData(() => basicClient!);
          it('should retrieve daily sleep data', tests.shouldRetrieveDailySleepData);
        });

        describe('getSleepStats', () => {
          const tests = testGetSleepStats(() => basicClient!);
          it('should retrieve sleep stats', tests.shouldRetrieveSleepStats);
        });
      });
    });
  });

  describe.skipIf(!shouldRunInteractiveMFATests)('create and authenticate (MFA Login)', () => {
    beforeAll(() => {
      requireMfaCredentials();
    });

    it('should successfully authenticate with MFA and create shared client (skipped in CI)', async () => {
      await getAuthenticatedMfaClient();
      expect(mfaClient).toBeDefined();
    }); // 10 minute timeout to allow for MFA input

    it('should throw MfaCodeInvalidError when invalid MFA code is provided', async () => {
      const authContext = await createAuthContext({
        username: GARMIN_MFA_USERNAME!,
        password: GARMIN_MFA_PASSWORD!,
      });

      if (authContext.mfaRequired) {
        await expect(create(authContext, '000000')).rejects.toThrow(MfaCodeInvalidError);
      }
    });

    // Run tests with MFA client
    describe('with authenticated MFA client', () => {
      beforeAll(async () => {
        await getAuthenticatedMfaClient();
      });

      describe('getActivities', () => {
        const tests = testGetActivitiesImpl(() => mfaClient!);

        it('should retrieve a list of activities', tests.shouldRetrieveListOfActivities);

        it('should support pagination with start and limit parameters', tests.shouldSupportPagination);

        it('should use default pagination values when not specified', tests.shouldUseDefaultPaginationValues);
      });

      describe('golf activities', () => {
        const tests = testGolfActivitiesImpl(() => mfaClient!);

        it(
          'should retrieve golf activities (rating and slope available via detail endpoint)',
          tests.shouldRetrieveGolfActivities
        );

        it(
          'should support pagination with page and perPage parameters for golf activities',
          tests.shouldSupportPaginationForGolfActivities
        );

        it(
          'should use default pagination values when not specified for golf activities',
          tests.shouldUseDefaultPaginationValuesForGolfActivities
        );
      });

      describe('golf rounds', () => {
        const tests = testGolfRoundsImpl(() => mfaClient!);

        it(
          'should retrieve golf rounds with combined data from activities and detail endpoints',
          tests.shouldRetrieveGolfRounds
        );

        it(
          'should support pagination with page and perPage parameters for golf rounds',
          tests.shouldSupportPaginationForGolfRounds
        );
      });

      describe('sleep', () => {
        describe('getDailySleepData', () => {
          const tests = testGetDailySleepData(() => basicClient!);
          it('should retrieve daily sleep data', tests.shouldRetrieveDailySleepData);
        });

        describe('getSleepStats', () => {
          const tests = testGetSleepStats(() => basicClient!);
          it('should retrieve sleep stats', tests.shouldRetrieveSleepStats);
        });
      });
    });
  });

  describe('Unauthenticated client', () => {
    it('should throw NotAuthenticatedError when calling getActivities without authentication', async () => {
      const unauthenticatedClient = GarminConnectClientImpl.createUnauthenticated();

      await expect(unauthenticatedClient.getActivities()).rejects.toThrow(NotAuthenticatedError);
    });

    it('should throw NotAuthenticatedError when calling getActivity without authentication', async () => {
      const unauthenticatedClient = GarminConnectClientImpl.createUnauthenticated();

      await expect(unauthenticatedClient.getActivity('123')).rejects.toThrow(NotAuthenticatedError);
    });

    it('should throw NotAuthenticatedError when calling getGolfActivities without authentication', async () => {
      const unauthenticatedClient = GarminConnectClientImpl.createUnauthenticated();

      await expect(unauthenticatedClient.getGolfActivities()).rejects.toThrow(NotAuthenticatedError);
    });

    it('should throw NotAuthenticatedError when calling getGolfRounds without authentication', async () => {
      const unauthenticatedClient = GarminConnectClientImpl.createUnauthenticated();

      await expect(unauthenticatedClient.getGolfRounds()).rejects.toThrow(NotAuthenticatedError);
    });

    describe('sleep', () => {
      it('should throw NotAuthenticatedError when calling getDailySleepData without authentication', async () => {
        const unauthenticatedClient = GarminConnectClientImpl.createUnauthenticated();

        await expect(unauthenticatedClient.sleep.getDailySleepData()).rejects.toThrow(NotAuthenticatedError);
      });

      it('should throw NotAuthenticatedError when calling getSleepStats without authentication', async () => {
        const unauthenticatedClient = GarminConnectClientImpl.createUnauthenticated();

        await expect(
          unauthenticatedClient.sleep.getSleepStats(DateTime.now().minus({ days: 7 }), DateTime.now())
        ).rejects.toThrow(NotAuthenticatedError);
      });
    });
  });
});
