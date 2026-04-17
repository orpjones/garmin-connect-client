// Shared OAuth utilities for Garmin Connect authentication

import type { OAuth2Token } from './types';

// Device-identity client IDs tried in rotation order for the diauth.garmin.com
// token exchange. Garmin mobile apps cycle through quarterly-rotated IDs; if
// one is rejected we try the next until one succeeds.
export const DI_CLIENT_IDS = [
  'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
  'GARMIN_CONNECT_MOBILE_ANDROID_DI_2024Q4',
  'GARMIN_CONNECT_MOBILE_ANDROID_DI',
  'GARMIN_CONNECT_MOBILE_IOS_DI',
] as const;

// OAuth2 grant type for exchanging a CAS service ticket via the device-identity endpoint.
export const DI_GRANT_TYPE = 'https://connectapi.garmin.com/di-oauth2-service/oauth/grant/service_ticket';

// Adds expiration timestamps to an OAuth2 token.
//
// Converts relative expiration times (expires_in in seconds) to absolute
// timestamps for easier expiration checking.
export function setOauth2TokenExpiresAt(token: OAuth2Token): OAuth2Token {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + token.expires_in;
  const refreshExpiresAt = now + token.refresh_token_expires_in;

  token.last_update_date = new Date().toISOString();
  token.expires_date = new Date(expiresAt * 1000).toISOString();
  token.expires_at = expiresAt;
  token.refresh_token_expires_at = refreshExpiresAt;
  return token;
}
