// Exchanges a Garmin CAS service ticket for an OAuth2 bearer token via the
// device-identity endpoint (diauth.garmin.com), and provides token refresh.
//
// Device-identity client IDs are tried in rotation order; the first that
// succeeds is stored so refresh can reuse it.
//
// See docs/authentication.md for the full protocol.

import axios from 'axios';

import { OAuthError } from './errors';
import { DI_CLIENT_IDS, DI_GRANT_TYPE, setOauth2TokenExpiresAt } from './oauth-utils';
import { OAuth2TokenSchema, type OAuth2Token } from './types';
import type { GarminUrls } from './urls';

export interface DiTokenResult {
  oauth2Token: OAuth2Token;
  diClientId: string;
}

// Exchanges a CAS service ticket for an OAuth2 token via the device-identity endpoint.
// Tries each device-identity client ID in turn; the first success wins.
export async function exchangeDiToken(urls: GarminUrls, ticket: string): Promise<DiTokenResult> {
  const serviceUrl = `${urls.SSO_BASE}/embed`;
  const errors: Error[] = [];

  for (const clientId of DI_CLIENT_IDS) {
    try {
      const oauth2Token = await postDiGrant(
        urls,
        {
          grant_type: DI_GRANT_TYPE,
          service_ticket: ticket,
          service_url: serviceUrl,
          client_id: clientId,
        },
        clientId
      );
      return { oauth2Token, diClientId: clientId };
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  throw new OAuthError(
    `Device-identity token exchange failed with all client IDs:\n${errors.map(error => error.message).join('\n')}`
  );
}

// Refreshes an OAuth2 token via the device-identity endpoint using the stored client ID.
export async function refreshDiToken(urls: GarminUrls, refreshToken: string, diClientId: string): Promise<OAuth2Token> {
  return postDiGrant(
    urls,
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: diClientId,
    },
    diClientId
  );
}

async function postDiGrant(
  urls: GarminUrls,
  parameters: Record<string, string>,
  clientId: string
): Promise<OAuth2Token> {
  const authorization = `Basic ${Buffer.from(`${clientId}:`).toString('base64')}`;
  const response = await axios.post(urls.DIAUTH_TOKEN_URL(), new URLSearchParams(parameters).toString(), {
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return setOauth2TokenExpiresAt(OAuth2TokenSchema.parse(response.data));
}
