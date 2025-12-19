import { describe, it, expect, beforeEach } from 'vitest';
import { GarminConnectClientImpl } from './client';
import type { GarminConnectClient, Activity } from './types';

describe('GarminConnectClientImpl', () => {
  let client: GarminConnectClient;

  beforeEach(() => {
    client = new GarminConnectClientImpl();
  });

  describe('implements GarminConnectClient interface', () => {
    it('should be an instance of GarminConnectClientImpl', () => {
      expect(client).toBeInstanceOf(GarminConnectClientImpl);
    });

    it('should satisfy the GarminConnectClient interface contract', () => {
      // TypeScript ensures this at compile time, but we can verify at runtime
      expect(client).toHaveProperty('getActivities');
      expect(client).toHaveProperty('getActivity');
      expect(typeof client.getActivities).toBe('function');
      expect(typeof client.getActivity).toBe('function');
    });
  });

  describe('getActivities', () => {
    it('should throw not implemented error', async () => {
      await expect(client.getActivities()).rejects.toThrow('Not implemented');
    });
  });

  describe('getActivity', () => {
    it('should throw not implemented error', async () => {
      await expect(client.getActivity('123')).rejects.toThrow('Not implemented');
    });
  });
});
