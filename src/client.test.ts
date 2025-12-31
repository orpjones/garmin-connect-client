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
import { beforeAll, describe, expect, it } from 'vitest';

import { GarminConnectClientImpl } from './client';
import { InvalidCredentialsError, MfaCodeInvalidError, MfaRequiredError, NotAuthenticatedError } from './errors';
import type { MfaCodeProvider } from './types';

import { create } from './index';

// Environment variables - loaded in beforeAll hook
let GARMIN_USERNAME: string | undefined;
let GARMIN_PASSWORD: string | undefined;
let GARMIN_MFA_USERNAME: string | undefined;
let GARMIN_MFA_PASSWORD: string | undefined;
let IS_CI: boolean;
let shouldRunInteractiveMFATests: boolean;

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

// MFA code provider that reads from console dynamically when called
class ConsoleMfaProvider implements MfaCodeProvider {
  async getMfaCode(): Promise<string> {
    return readMfaCodeFromConsole();
  }
}

// MFA code provider that returns a fixed invalid code for testing
class InvalidMfaProvider implements MfaCodeProvider {
  async getMfaCode(): Promise<string> {
    return '000000'; // Invalid code
  }
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
    IS_CI = process.env.CI === 'true' || process.env.CI === '1';
    // Interactive MFA tests require user input and should be skipped in CI
    shouldRunInteractiveMFATests = !IS_CI;
  });

  describe.skipIf(!shouldRunInteractiveMFATests)('create and authenticate (Basic Login - No MFA)', () => {
    beforeAll(() => {
      // Fail fast if credentials are missing
      if (!GARMIN_USERNAME || !GARMIN_PASSWORD) {
        throw new Error('GARMIN_USERNAME and GARMIN_PASSWORD must be set in .env file');
      }
    });

    it('should create and authenticate a client instance', async () => {
      await create({
        username: GARMIN_USERNAME!,
        password: GARMIN_PASSWORD!,
      });
    }, 30_000);

    it('should throw an error for invalid password', async () => {
      await expect(
        create({
          username: GARMIN_USERNAME!,
          password: 'invalid-password',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    }, 30_000);

    it('should throw an error for invalid username', async () => {
      await expect(
        create({
          username: 'invalid-username@example.com',
          password: 'some-password',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    }, 30_000);
  });

  describe('create and authenticate (MFA Login)', () => {
    beforeAll(() => {
      // Only require credentials for interactive tests
      if (shouldRunInteractiveMFATests && (!GARMIN_MFA_USERNAME || !GARMIN_MFA_PASSWORD)) {
        throw new Error('GARMIN_MFA_USERNAME and GARMIN_MFA_PASSWORD must be set in .env file');
      }
    });

    it.skipIf(!shouldRunInteractiveMFATests)(
      'should successfully authenticate with MFA (skipped in CI)',
      async () => {
        // The MFA provider will be called dynamically during authentication
        // when MFA is detected. The user will be prompted at that point.
        const mfaProvider = new ConsoleMfaProvider();

        const client = await create({
          username: GARMIN_MFA_USERNAME!,
          password: GARMIN_MFA_PASSWORD!,
          mfaCodeProvider: mfaProvider,
        });

        expect(client).toBeDefined();
      },
      600_000 // 10 minute timeout to allow for MFA input
    );

    it('should throw an error for invalid password with MFA account', async () => {
      // This test doesn't require real credentials - it tests error handling
      await expect(
        create({
          username: 'test@example.com',
          password: 'invalid-password',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    }, 30_000);

    it.skipIf(!shouldRunInteractiveMFATests)(
      'should throw an error when MFA is required but no provider is configured',
      async () => {
        // This test assumes the MFA account requires MFA
        // If it doesn't require MFA, this test will fail with a different error
        await expect(
          create({
            username: GARMIN_MFA_USERNAME!,
            password: GARMIN_MFA_PASSWORD!,
            // No mfaCodeProvider provided
          })
        ).rejects.toThrow(MfaRequiredError);
      },
      30_000
    );

    it.skipIf(!shouldRunInteractiveMFATests)(
      'should throw MfaCodeInvalidError when invalid MFA code is provided',
      async () => {
        const invalidMfaProvider = new InvalidMfaProvider();

        await expect(
          create({
            username: GARMIN_MFA_USERNAME!,
            password: GARMIN_MFA_PASSWORD!,
            mfaCodeProvider: invalidMfaProvider,
          })
        ).rejects.toThrow(MfaCodeInvalidError);
      },
      30_000
    );
  });

  describe.skipIf(!shouldRunInteractiveMFATests)('getActivities', () => {
    let client: Awaited<ReturnType<typeof create>>;

    beforeAll(async () => {
      // Fail fast if MFA credentials are missing
      if (!GARMIN_MFA_USERNAME || !GARMIN_MFA_PASSWORD) {
        throw new Error('GARMIN_MFA_USERNAME and GARMIN_MFA_PASSWORD must be set in .env file');
      }

      // Create a single client instance to reuse across all tests
      // Uses MFA account and requires MFA provider
      const mfaProvider = new ConsoleMfaProvider();
      client = await create({
        username: GARMIN_MFA_USERNAME!,
        password: GARMIN_MFA_PASSWORD!,
        mfaCodeProvider: mfaProvider,
      });
    }, 600_000); // 10 minute timeout to allow for MFA input

    it('should retrieve a list of activities', async () => {
      const activities = await client.getActivities();

      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
    }, 30_000);

    it('should support pagination with start and limit parameters', async () => {
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
    }, 30_000);

    it('should use default pagination values when not specified', async () => {
      const activities = await client.getActivities();

      expect(activities).toBeDefined();
      expect(Array.isArray(activities)).toBe(true);
      // Default limit is 20
      expect(activities.length).toBeLessThanOrEqual(20);
    }, 30_000);

    it('should retrieve golf activities', async () => {
      const golfActivities = await client.getGolfActivities();

      expect(golfActivities).toBeDefined();
    }, 30_000);

    it('should support pagination with page and perPage parameters for golf activities', async () => {
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
    }, 30_000);

    it('should use default pagination values when not specified for golf activities', async () => {
      const golfActivities = await client.getGolfActivities();

      expect(golfActivities.pageNumber).toBe(1);
      // Default perPage is 20
      expect(golfActivities.rowsPerPage).toBe(20);
    }, 30_000);
  });

  describe('Unauthenticated client', () => {
    it('should throw NotAuthenticatedError when calling getActivities without authentication', async () => {
      const unauthenticatedClient = GarminConnectClientImpl.createUnauthenticated({
        username: 'test@example.com',
        password: 'password',
      });

      await expect(unauthenticatedClient.getActivities()).rejects.toThrow(NotAuthenticatedError);
    });

    it('should throw NotAuthenticatedError when calling getActivity without authentication', async () => {
      const unauthenticatedClient = GarminConnectClientImpl.createUnauthenticated({
        username: 'test@example.com',
        password: 'password',
      });

      await expect(unauthenticatedClient.getActivity('123')).rejects.toThrow(NotAuthenticatedError);
    });

    it('should throw NotAuthenticatedError when calling getGolfActivities without authentication', async () => {
      const unauthenticatedClient = GarminConnectClientImpl.createUnauthenticated({
        username: 'test@example.com',
        password: 'password',
      });

      await expect(unauthenticatedClient.getGolfActivities()).rejects.toThrow(NotAuthenticatedError);
    });
  });
});
