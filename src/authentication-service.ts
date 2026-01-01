// Authentication service for Garmin Connect API.
//
// Handles the complete authentication flow:
// 1. Submit credentials and handle MFA if required
// 2. Exchange login ticket for OAuth 1.0 token
// 3. Exchange OAuth 1.0 token for OAuth 2.0 bearer token
//
// This service uses HttpClient internally to perform HTTP requests during authentication.
import { z } from 'zod';

import { AuthContext, MfaMethod, parseMfaMethod } from './auth-context';
import { HttpError, InvalidCredentialsError, MfaCodeError, MfaCodeInvalidError } from './errors';
import { HttpClient } from './http-client';
import {
  USER_AGENT_CONNECTMOBILE,
  USER_AGENT_MOBILE_IOS,
  createOauthClient,
  getAppOauthIdentity,
  setOauth2TokenExpiresAt,
} from './oauth-utils';
import type { OAuth1Token, OAuth2Token } from './types';
import { GarminUrls } from './urls';

// Discriminated union type for authentication completion parameters
export type AuthenticationParameters =
  | { type: 'ticket'; ticket: string }
  | { type: 'mfa'; mfaCode: string; mfaMethod: MfaMethod };

// Result classes for authentication flow
export class AuthenticationSuccess {
  readonly ticket: string;
  readonly cookies: string;

  constructor(ticket: string, cookies: string) {
    this.ticket = ticket;
    this.cookies = cookies;
  }
}

export class MfaRequiredResult {
  readonly mfaMethod: MfaMethod;
  readonly cookies: string;

  constructor(mfaMethod: MfaMethod, cookies: string) {
    this.mfaMethod = mfaMethod;
    this.cookies = cookies;
  }
}

// Zod schemas for API responses
const LoginResponseSchema = z
  .object({
    serviceURL: z.string().nullable().optional(),
    serviceTicketId: z.string().nullable().optional(),
    responseStatus: z
      .object({
        type: z.string(),
        message: z.string().optional(),
        httpStatus: z.string().optional(),
      })
      .optional(),
    responseReason: z.string().nullable().optional(),
    customerMfaInfo: z
      .object({
        mfaLastMethodUsed: z.string().optional(),
        email: z.string().optional(),
        phoneNumber: z.string().nullable().optional(),
        defaultMfaMethod: z.string().nullable().optional(),
        mfaUISetting: z
          .object({
            allowPhoneOption: z.boolean().optional(),
            allowAddEmailAddress: z.boolean().optional(),
            chooseDifferentWayShown: z.boolean().optional(),
          })
          .optional(),
      })
      .nullable()
      .optional(),
    consentTypeList: z.array(z.unknown()).nullable().optional(),
    captchaAlreadyPassed: z.boolean().optional(),
    samlResponse: z.string().nullable().optional(),
    authType: z.string().nullable().optional(),
  })
  .passthrough();

type LoginResponse = z.infer<typeof LoginResponseSchema>;

// Discriminated union for login ticket result
type LoginTicketResult = { type: 'success'; ticket: string } | { type: 'mfa_required'; mfaMethod: MfaMethod };

// Helper function to parse login response and extract error information
function parseLoginResponseError(error: unknown): LoginResponse | undefined {
  if (error instanceof HttpError && error.responseData) {
    const errorResponse = LoginResponseSchema.safeParse(error.responseData);
    if (errorResponse.success) {
      return errorResponse.data;
    }
  }
  return undefined;
}

// Helper function to extract InvalidCredentialsError from login response errors
function extractInvalidCredentialsError(error: unknown): InvalidCredentialsError | undefined {
  const loginResponse = parseLoginResponseError(error);
  if (loginResponse) {
    const responseStatus = loginResponse.responseStatus;
    if (responseStatus?.type === 'INVALID_USERNAME_PASSWORD') {
      return new InvalidCredentialsError('Invalid username or password');
    }
  }
  // Fallback to status code check if responseStatus not available
  if (error instanceof HttpError && (error.statusCode === 401 || error.statusCode === 403)) {
    return new InvalidCredentialsError('Invalid username or password');
  }
  return undefined;
}

// Helper function to extract MfaCodeInvalidError from MFA verification errors
function extractMfaCodeInvalidError(error: unknown): MfaCodeInvalidError | undefined {
  const loginResponse = parseLoginResponseError(error);
  if (loginResponse?.responseStatus) {
    const responseStatus = loginResponse.responseStatus;
    if (responseStatus.type === 'SESSION_EXPIRED') {
      return new MfaCodeInvalidError('Session expired. Please try logging in again.');
    }
  }
  // Fallback to status code check
  if (error instanceof HttpError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return new MfaCodeInvalidError('Invalid MFA code');
    }
    // Handle 409 Conflict (session expired)
    if (error.statusCode === 409) {
      return new MfaCodeInvalidError('Session expired. Please try logging in again.');
    }
  }
  return undefined;
}

// Helper function to create common JSON API headers for authentication requests
function getJsonApiHeaders(urls: GarminUrls, referer: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    Origin: urls.GARMIN_SSO_ORIGIN,
    Referer: referer,
    'User-Agent': USER_AGENT_MOBILE_IOS,
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
  };
}

export class AuthenticationService {
  // Starts authentication and returns MFA context if MFA is required
  // Returns AuthenticationSuccess with ticket and cookies if authentication succeeds, or MfaRequiredResult if MFA is needed
  static async startAuthentication(
    urls: GarminUrls,
    username: string,
    password: string
  ): Promise<AuthenticationSuccess | MfaRequiredResult> {
    const httpClient = new HttpClient(urls);
    const ticketResult = await AuthenticationService.getLoginTicket(httpClient, urls, username, password);
    const cookies = httpClient.getCookies();
    if (ticketResult.type === 'success') {
      return new AuthenticationSuccess(ticketResult.ticket, cookies);
    }
    return new MfaRequiredResult(ticketResult.mfaMethod, cookies);
  }

  // Completes authentication using either a ticket (non-MFA) or MFA code
  // Returns an authenticated HttpClient instance
  static async completeAuthentication(
    urls: GarminUrls,
    cookies: string,
    parameters: AuthenticationParameters
  ): Promise<HttpClient> {
    // Create an unauthenticated HttpClient with cookies for making auth requests
    // We'll create an authenticated one after completing OAuth flow
    const httpClient = new HttpClient(urls, undefined, cookies);

    // Extract ticket from parameters (either directly or via MFA verification)
    const serviceTicketId = await AuthenticationService.extractServiceTicketId(httpClient, urls, parameters);

    // Complete OAuth flow
    const { oauth1Token, oauth2Token } = await AuthenticationService.completeOAuthFlow(
      httpClient,
      urls,
      serviceTicketId
    );
    const updatedCookies = httpClient.getCookies();
    // Create fully authenticated AuthContext with OAuth tokens
    const authenticatedContext = new AuthContext(
      false, // mfaRequired is false after OAuth completes
      updatedCookies,
      undefined, // mfaMethod not needed after auth
      undefined, // ticket not needed after OAuth
      oauth1Token,
      oauth2Token
    );
    // Create a new authenticated HttpClient with the authenticated context
    return new HttpClient(urls, authenticatedContext);
  }

  // Extracts service ticket ID from authentication parameters
  // Handles both ticket-based (non-MFA) and MFA-based authentication
  private static async extractServiceTicketId(
    httpClient: HttpClient,
    urls: GarminUrls,
    parameters: AuthenticationParameters
  ): Promise<string> {
    if (parameters.type === 'ticket') {
      // Non-MFA case - use provided ticket
      return parameters.ticket;
    }

    // MFA case - verify code and get ticket
    if (!parameters.mfaCode.trim()) {
      throw new MfaCodeError();
    }

    const mfaResult = await AuthenticationService.verifyMfaCode(
      httpClient,
      urls,
      parameters.mfaCode.trim(),
      parameters.mfaMethod
    );
    if (!mfaResult.serviceTicketId) {
      throw new MfaCodeInvalidError('MFA code submitted but ticket not found - please check your MFA code');
    }
    return mfaResult.serviceTicketId;
  }

  // Obtains a login ticket
  // Returns discriminated union with ticket if successful, or MFA requirement if MFA needed
  private static async getLoginTicket(
    httpClient: HttpClient,
    urls: GarminUrls,
    username: string,
    password: string
  ): Promise<LoginTicketResult> {
    // First, visit the sign-in page to establish a session and get cookies
    const signInUrl = urls.SIGN_IN_PAGE();

    await httpClient.get<string>(signInUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': USER_AGENT_MOBILE_IOS,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    const loginUrl = urls.LOGIN_API();

    const loginBody = {
      username,
      password,
      rememberMe: false,
      captchaToken: '',
    };

    let loginResponse: LoginResponse;
    try {
      const response = await httpClient.post(loginUrl, loginBody, {
        headers: getJsonApiHeaders(urls, urls.SIGN_IN_REFERER()),
      });
      loginResponse = LoginResponseSchema.parse(response);
    } catch (error) {
      const credentialsError = extractInvalidCredentialsError(error);
      if (credentialsError) {
        throw credentialsError;
      }
      throw error;
    }

    // Try to extract ticket first - if present, login was successful
    if (loginResponse.serviceTicketId) {
      return { type: 'success', ticket: loginResponse.serviceTicketId };
    }

    // No ticket found - check if MFA is required
    if (loginResponse.responseStatus?.type === 'MFA_REQUIRED') {
      const methodString = loginResponse.customerMfaInfo?.mfaLastMethodUsed || 'email';
      const mfaMethod = parseMfaMethod(methodString);
      return { type: 'mfa_required', mfaMethod };
    }

    throw new InvalidCredentialsError('login failed (Ticket not found or MFA), please check username and password');
  }

  // Verifies a multi-factor authentication code
  // Returns the authentication response containing the login ticket
  // Throws MfaCodeInvalidError if the MFA code is invalid or expired
  private static async verifyMfaCode(
    httpClient: HttpClient,
    urls: GarminUrls,
    mfaCode: string,
    mfaMethod: MfaMethod = MfaMethod.EMAIL
  ): Promise<LoginResponse> {
    const mfaUrl = urls.MFA_VERIFY_API();

    const mfaBody = {
      mfaMethod: mfaMethod,
      mfaVerificationCode: mfaCode,
      rememberMyBrowser: false,
      reconsentList: [],
      mfaSetup: false,
    };

    try {
      const response = await httpClient.post<unknown>(mfaUrl, mfaBody, {
        headers: getJsonApiHeaders(urls, urls.MFA_REFERER()),
      });
      const result = LoginResponseSchema.parse(response);

      // Check for MFA_CODE_INVALID in response status (can occur even with 200 OK)
      if (result.responseStatus?.type === 'MFA_CODE_INVALID') {
        throw new MfaCodeInvalidError(
          result.responseStatus.message || 'Invalid MFA code. Please check your code and try again.'
        );
      }

      return result;
    } catch (error) {
      const mfaError = extractMfaCodeInvalidError(error);
      if (mfaError) {
        throw mfaError;
      }
      throw error;
    }
  }

  // Completes the OAuth flow: exchanges ticket for OAuth 1.0 token, then OAuth 2.0 token
  // Returns the tokens for creating an authenticated HttpClient
  private static async completeOAuthFlow(
    httpClient: HttpClient,
    urls: GarminUrls,
    ticket: string
  ): Promise<{ oauth1Token: OAuth1Token; oauth2Token: OAuth2Token }> {
    const oauth1Token = await AuthenticationService.getOauth1Token(httpClient, urls, ticket);
    const oauth2Token = await AuthenticationService.exchange(httpClient, urls, oauth1Token);
    return { oauth1Token, oauth2Token };
  }

  // Exchanges a login ticket for an OAuth 1.0 token
  // Uses OAuth 1.0a signing to authenticate the request
  // Returns OAuth 1.0 token containing oauth_token and oauth_token_secret
  private static async getOauth1Token(httpClient: HttpClient, urls: GarminUrls, ticket: string): Promise<OAuth1Token> {
    const oauthParameters = {
      ticket,
      'login-url': urls.MOBILE_SERVICE,
      'accepts-mfa-tokens': true,
    };

    const appOauthIdentity = getAppOauthIdentity();
    const oauth = createOauthClient(appOauthIdentity);
    const baseUrl = urls.OAUTH_PREAUTHORIZED_BASE();

    const requestData = {
      url: baseUrl,
      method: 'GET',
      data: oauthParameters,
    };
    const authData = oauth.authorize(requestData);
    // Convert Authorization object to plain object for URL building
    const authParameters = { ...authData } as Record<string, unknown>;
    const url = urls.OAUTH_PREAUTHORIZED(oauthParameters, authParameters);

    const response = await httpClient.get<string>(url, {
      headers: {
        'User-Agent': USER_AGENT_CONNECTMOBILE,
      },
    });
    // Parse the query string response (format: "oauth_token=xxx&oauth_token_secret=yyy")
    const responseParameters = new URLSearchParams(response);
    const token: OAuth1Token = {
      oauth_token: responseParameters.get('oauth_token') || '',
      oauth_token_secret: responseParameters.get('oauth_token_secret') || '',
    };
    return token;
  }

  // Exchanges an OAuth 1.0 token for an OAuth 2.0 bearer token
  //
  // This is the final step in the authentication flow. The OAuth 2.0 token
  // is used for all subsequent API requests via Bearer authentication.
  // Returns OAuth 2.0 bearer token with expiration metadata
  private static async exchange(
    httpClient: HttpClient,
    urls: GarminUrls,
    oauth1Token: OAuth1Token
  ): Promise<OAuth2Token> {
    const appOauthIdentity = getAppOauthIdentity();
    const oauth = createOauthClient(appOauthIdentity);
    const token = {
      key: oauth1Token.oauth_token,
      secret: oauth1Token.oauth_token_secret,
    };

    const baseUrl = urls.OAUTH_EXCHANGE_BASE();
    const requestData = {
      url: baseUrl,
      method: 'POST',
    };

    const step5AuthData = oauth.authorize(requestData, token);
    // Convert Authorization object to plain object for URL building
    const oauthParameters = { ...step5AuthData } as Record<string, unknown>;
    const url = urls.OAUTH_EXCHANGE(oauthParameters);
    const response = await httpClient.post<OAuth2Token>(url, undefined, {
      headers: {
        'User-Agent': USER_AGENT_CONNECTMOBILE,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return setOauth2TokenExpiresAt(response);
  }
}
