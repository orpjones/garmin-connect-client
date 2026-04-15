import nock from 'nock';
import { afterEach, describe, expect, it } from 'vitest';

import { OAuthError } from './errors';
import { DI_CLIENT_IDS } from './oauth-utils';
import { exchangeDiToken, refreshDiToken } from './oauth2-exchanger';
import { GarminUrls } from './urls';

const urls = new GarminUrls();
const diAuthUrl = new URL(urls.DIAUTH_TOKEN_URL());
const DIAUTH_HOST = diAuthUrl.origin;
const DIAUTH_PATH = diAuthUrl.pathname;

function tokenBody(accessToken = 'bearer-token') {
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'rt-123',
    refresh_token_expires_in: 7200,
  };
}

afterEach(() => nock.cleanAll());

describe('exchangeDiToken', () => {
  it('exchanges a ticket using the first client ID that succeeds', async () => {
    nock(DIAUTH_HOST).post(DIAUTH_PATH).reply(200, tokenBody('first-token'));

    const { oauth2Token, diClientId } = await exchangeDiToken(urls, 'ST-ticket-123');

    expect(oauth2Token.access_token).toBe('first-token');
    expect(oauth2Token.expires_at).toBeDefined();
    expect(oauth2Token.refresh_token_expires_at).toBeDefined();
    expect(diClientId).toBe(DI_CLIENT_IDS[0]);
  });

  it('falls through to the next client ID on failure', async () => {
    nock(DIAUTH_HOST).post(DIAUTH_PATH).reply(401, { error: 'unauthorized' });
    nock(DIAUTH_HOST).post(DIAUTH_PATH).reply(200, tokenBody('second-token'));

    const { oauth2Token, diClientId } = await exchangeDiToken(urls, 'ST-ticket-456');

    expect(diClientId).toBe(DI_CLIENT_IDS[1]);
    expect(oauth2Token.access_token).toBe('second-token');
  });

  it('throws OAuthError after exhausting all client IDs', async () => {
    for (const _id of DI_CLIENT_IDS) {
      nock(DIAUTH_HOST).post(DIAUTH_PATH).reply(401, { error: 'unauthorized' });
    }

    await expect(exchangeDiToken(urls, 'ST-bad-ticket')).rejects.toBeInstanceOf(OAuthError);
  });

  it('throws when the response schema is invalid', async () => {
    nock(DIAUTH_HOST).post(DIAUTH_PATH).reply(200, { not_a_token: true });

    await expect(exchangeDiToken(urls, 'ST-bad-response')).rejects.toThrow();
  });
});

describe('refreshDiToken', () => {
  it('refreshes using the stored client ID', async () => {
    nock(DIAUTH_HOST).post(DIAUTH_PATH).reply(200, tokenBody('refreshed-token'));

    const token = await refreshDiToken(urls, 'rt-old', DI_CLIENT_IDS[2]);

    expect(token.access_token).toBe('refreshed-token');
    expect(token.expires_at).toBeDefined();
  });
});
