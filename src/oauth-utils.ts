// Shared OAuth utilities for Garmin Connect authentication
//
// Contains OAuth constants, user agents, and helper functions used
// across authentication-service.ts and http-client.ts

import crypto from 'node:crypto';

import OAuth from 'oauth-1.0a';

import type { OAuth1AppIdentity, OAuth2Token } from './types';

// User agent string for Garmin Connect Mobile app
export const USER_AGENT_CONNECTMOBILE = 'com.garmin.android.apps.connectmobile';

// User agent string for iOS mobile browser
export const USER_AGENT_MOBILE_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

// OAuth 1.0 consumer credentials
// These are public values used for authentication and can be safely included in client applications
export const OAUTH_CONSUMER_KEY = 'fc3e99d2-118c-44b8-8ae3-03370dde24c0';
export const OAUTH_CONSUMER_SECRET = 'E08WAR897WEy2knn7aFBrvegVAf0AFdWBBF';

// Helper function to create OAuth app identity
export function getAppOauthIdentity(): OAuth1AppIdentity {
  return {
    key: OAUTH_CONSUMER_KEY,
    secret: OAUTH_CONSUMER_SECRET,
  };
}

// Creates an OAuth 1.0a client instance with HMAC-SHA1 signature method
export function createOauthClient(appIdentity: OAuth1AppIdentity): OAuth {
  return new OAuth({
    consumer: appIdentity,
    signature_method: 'HMAC-SHA1',
    hash_function(base_string: string, key: string) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });
}

// Adds expiration timestamps to an OAuth 2.0 token
//
// Converts relative expiration times (expires_in in seconds) to absolute
// timestamps for easier expiration checking
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
