// Authentication service for Garmin Connect.
//
// Orchestrates the SSO embed login flow:
//   1. Drives steps 1–4 (embed → signin → credentials → MFA) over CurlClient
//      so Cloudflare accepts the request.
//   2. The resulting service ticket is exchanged for an OAuth2 bearer token
//      via the device-identity endpoint (diauth.garmin.com).

import { parseCsrfToken, parseSsoPostResponse, type SsoPostResult } from './auth-html-parser';
import { CurlClient } from './curl-client';
import { InvalidCredentialsError, MfaCodeError, MfaCodeInvalidError } from './errors';
import { HttpClient } from './http-client';
import { exchangeDiToken } from './oauth2-exchanger';
import { GarminUrls } from './urls';

// Intermediate state handed from `startAuthentication` to `completeAuthentication`.
// Represents one of two mutually exclusive outcomes of the credentials POST:
//   - credentials accepted: we hold a service ticket ready for token exchange.
//   - MFA required: we hold the curl session cookies so the MFA code POST
//     can resume the same session.
export type AuthContext =
  | { readonly mfaRequired: false; readonly cookies: string; readonly ticket: string }
  | { readonly mfaRequired: true; readonly cookies: string };

export class AuthenticationService {
  // Drives the SSO flow up to (and not including) the OAuth exchange.
  // Returns either a service ticket ready for exchange, or an MFA challenge.
  static async startAuthentication(urls: GarminUrls, username: string, password: string): Promise<AuthContext> {
    const curl = new CurlClient();
    try {
      // Seed session cookies via the embed endpoint before fetching the signin form.
      await curl.get(urls.SSO_EMBED());
      const signinHtml = await curl.get(urls.SSO_SIGNIN(), {
        headers: ['Referer: ' + urls.SSO_BASE + '/embed'],
      });

      const csrf = parseCsrfToken(signinHtml);
      const credBody = new URLSearchParams({
        username,
        password,
        embed: 'true',
        _csrf: csrf,
      }).toString();
      const postHtml = await curl.post(urls.SSO_SIGNIN(), credBody, {
        headers: ['Referer: ' + urls.SSO_SIGNIN(), 'Content-Type: application/x-www-form-urlencoded'],
        allowClientError: true,
      });

      const result = parseSsoPostResponse(postHtml);
      const cookies = curl.getCookies();

      if (result.type === 'success') {
        return { mfaRequired: false, cookies, ticket: result.ticket };
      }
      if (result.type === 'mfa_required') {
        return { mfaRequired: true, cookies };
      }
      throw AuthenticationService.loginError(result);
    } finally {
      curl.close();
    }
  }

  // Completes authentication by turning an AuthContext (plus an optional MFA
  // code when one is required) into a fully authenticated HttpClient.
  static async completeAuthentication(urls: GarminUrls, context: AuthContext, mfaCode?: string): Promise<HttpClient> {
    const { ticket } = context.mfaRequired
      ? await AuthenticationService.verifyMfaCode(urls, context.cookies, mfaCode)
      : context;

    const { oauth2Token, diClientId } = await exchangeDiToken(urls, ticket);
    return new HttpClient(urls, { oauth2Token, diClientId });
  }

  // Resumes the SSO session with the user-supplied MFA code. Requires the
  // cookies captured by `startAuthentication` so Garmin accepts the POST.
  private static async verifyMfaCode(urls: GarminUrls, cookies: string, mfaCode?: string): Promise<{ ticket: string }> {
    if (!mfaCode?.trim()) {
      throw new MfaCodeError();
    }
    const curl = new CurlClient(cookies);
    try {
      // Re-scrape the CSRF token from the MFA page — it rotates across requests.
      await curl.get(urls.SSO_EMBED());
      const mfaPageHtml = await curl.get(urls.SSO_SIGNIN(), {
        headers: ['Referer: ' + urls.SSO_BASE + '/embed'],
      });

      const csrf = parseCsrfToken(mfaPageHtml);
      const mfaBody = new URLSearchParams({
        'mfa-code': mfaCode.trim(),
        embed: 'true',
        _csrf: csrf,
        fromPage: 'setupEnterMfaCode',
      }).toString();
      const postHtml = await curl.post(urls.SSO_MFA_VERIFY(), mfaBody, {
        headers: ['Referer: ' + urls.SSO_SIGNIN(), 'Content-Type: application/x-www-form-urlencoded'],
        allowClientError: true,
      });

      const result = parseSsoPostResponse(postHtml);
      if (result.type === 'success') {
        return { ticket: result.ticket };
      }
      if (result.type === 'mfa_required') {
        throw new MfaCodeInvalidError('MFA code rejected; server still requires MFA');
      }
      throw new MfaCodeInvalidError(result.message ?? 'Invalid MFA code');
    } finally {
      curl.close();
    }
  }

  private static loginError(
    result: Exclude<SsoPostResult, { type: 'success' | 'mfa_required' }>
  ): InvalidCredentialsError {
    if (result.type === 'locked') {
      return new InvalidCredentialsError(result.message ?? 'Account is locked');
    }
    if (result.type === 'invalid' || result.type === 'error') {
      return new InvalidCredentialsError(result.message ?? 'Login failed');
    }
    const _exhaustive: never = result;
    return _exhaustive;
  }
}
