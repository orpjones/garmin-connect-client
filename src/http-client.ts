// HTTP client for Garmin Connect API requests.
//
// Handles authentication, token management, and HTTP requests. This class:
// - Performs OAuth 1.0/2.0 authentication flow
// - Manages OAuth token storage and lifecycle
// - Automatically refreshes expired tokens
// - Makes authenticated HTTP requests to the Garmin Connect API
//
// The authentication flow follows the standard Garmin SSO process:
// 1. Submit credentials and handle MFA if required
// 2. Exchange login ticket for OAuth 1.0 token
// 3. Exchange OAuth 1.0 token for OAuth 2.0 bearer token
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import { z } from 'zod';
import {
  HttpError,
  InvalidCredentialsError,
  MfaCodeError,
  MfaCodeInvalidError,
  MfaRequiredError,
  OAuthTokenError,
} from './errors';
import type { MfaCodeProvider, OAuth1AppIdentity, OAuth1Token, OAuth2Token } from './types';
import { GarminUrls } from './urls';

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

// User agent string for Garmin Connect Mobile app
const USER_AGENT_CONNECTMOBILE = 'com.garmin.android.apps.connectmobile';

// User agent string for iOS mobile browser
const USER_AGENT_MOBILE_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

// OAuth 1.0 consumer credentials
// These are public values used for authentication and can be safely included in client applications
const OAUTH_CONSUMER_KEY = 'fc3e99d2-118c-44b8-8ae3-03370dde24c0';
const OAUTH_CONSUMER_SECRET = 'E08WAR897WEy2knn7aFBrvegVAf0AFdWBBF';

export class HttpClient {
  private client: AxiosInstance;
  // OAuth 1.0 token used for refreshing the OAuth 2.0 token
  private oauth1Token?: OAuth1Token;
  // OAuth 2.0 bearer token used for authenticated API requests
  private oauth2Token?: OAuth2Token;
  private urls: GarminUrls;
  // Optional provider for MFA verification codes
  private mfaCodeProvider?: MfaCodeProvider;
  // OAuth 1.0 application identity (consumer key/secret)
  private readonly appOauthIdentity: OAuth1AppIdentity;
  // Flag to prevent concurrent token refresh attempts
  private isRefreshing = false;
  // Shared promise for concurrent refresh requests to avoid duplicate refresh calls
  private refreshPromise?: Promise<string>;

  constructor(urls: GarminUrls, mfaCodeProvider?: MfaCodeProvider) {
    this.urls = urls;
    this.mfaCodeProvider = mfaCodeProvider;
    const jar = new CookieJar();
    this.client = wrapper(axios.create({ jar }));
    this.appOauthIdentity = {
      key: OAUTH_CONSUMER_KEY,
      secret: OAUTH_CONSUMER_SECRET,
    };

    // Response interceptor: automatically refreshes expired tokens
    // When a request fails with 401 (Unauthorized), the token is refreshed
    // and the original request is retried transparently
    this.client.interceptors.response.use(
      response => response,
      async error => {
        // Convert axios errors to HttpError immediately to ensure serializability
        if (axios.isAxiosError(error)) {
          const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
          const status = error.response?.status;
          const statusText = error.response?.statusText;
          const data = error.response?.data;

          if (status === 401 && originalRequest && !originalRequest._retry) {
            if (!this.oauth2Token || !this.oauth1Token) {
              throw new HttpError(`HTTP request failed: ${error.message}`, status, statusText, data);
            }

            originalRequest._retry = true;
            try {
              const newToken = await this.refreshToken();
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            } catch (refreshError) {
              throw refreshError;
            }
          }

          throw new HttpError(`HTTP request failed: ${error.message}`, status, statusText, data);
        }

        throw error;
      }
    );

    // Request interceptor: automatically adds Bearer token to all requests
    // Ensures all API calls are authenticated without manual token management
    this.client.interceptors.request.use(async config => {
      if (this.oauth2Token) {
        config.headers.Authorization = `Bearer ${this.oauth2Token.access_token}`;
      }
      return config;
    });
  }

  // Performs the complete authentication flow
  //
  // This method orchestrates the OAuth authentication process:
  // 1. Obtains a login ticket from Garmin SSO (handles MFA if required)
  // 2. Exchanges the ticket for an OAuth 1.0 token
  // 3. Exchanges the OAuth 1.0 token for an OAuth 2.0 bearer token
  //
  // Returns both OAuth tokens (OAuth 1.0 is needed for refresh, OAuth 2.0 for API calls)
  // Throws InvalidCredentialsError if credentials are invalid
  // Throws MfaRequiredError if MFA is required but no provider is configured
  // Throws MfaCodeError if MFA code is missing or empty
  // Throws MfaCodeInvalidError if MFA code is invalid
  async authenticate(
    username: string,
    password: string
  ): Promise<{ oauth1Token: OAuth1Token; oauth2Token: OAuth2Token }> {
    const ticket = await this.getLoginTicket(username, password);
    const oauth1Token = await this.getOauth1Token(ticket);
    const oauth2Token = await this.exchange(oauth1Token);
    this.oauth1Token = oauth1Token;
    this.oauth2Token = oauth2Token;
    return {
      oauth1Token,
      oauth2Token,
    };
  }

  // Obtains a login ticket from Garmin SSO
  //
  // Submits credentials and handles MFA if required. Returns a login ticket
  // that can be exchanged for OAuth tokens.
  //
  // Throws InvalidCredentialsError if credentials are invalid
  // Throws MfaRequiredError if MFA is required but no provider is configured
  // Throws MfaCodeError if MFA code is missing or empty
  // Throws MfaCodeInvalidError if MFA code is invalid
  private async getLoginTicket(username: string, password: string): Promise<string> {
    // First, visit the sign-in page to establish a session and get cookies
    const signInUrl = this.urls.SIGN_IN_PAGE();

    await this.get<string>(signInUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': USER_AGENT_MOBILE_IOS,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    const loginUrl = this.urls.LOGIN_API();

    const loginBody = {
      username,
      password,
      rememberMe: false,
      captchaToken: '',
    };

    let loginResponse: LoginResponse;
    try {
      const response = await this.post(loginUrl, loginBody, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
          Origin: this.urls.GARMIN_SSO_ORIGIN,
          Referer: this.urls.SIGN_IN_REFERER(),
          'User-Agent': USER_AGENT_MOBILE_IOS,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });
      loginResponse = LoginResponseSchema.parse(response);
    } catch (error) {
      if (error instanceof HttpError && error.responseData) {
        // Try to parse the error response to get responseStatus information
        const errorResponse = LoginResponseSchema.safeParse(error.responseData);
        if (errorResponse.success) {
          const responseStatus = errorResponse.data.responseStatus;
          if (responseStatus?.type === 'INVALID_USERNAME_PASSWORD') {
            throw new InvalidCredentialsError('Invalid username or password');
          }
        }
        // Fallback to status code check if responseStatus not available
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw new InvalidCredentialsError('Invalid username or password');
        }
      }
      throw error;
    }

    // Try to extract ticket first - if present, login was successful
    if (loginResponse.serviceTicketId) {
      return loginResponse.serviceTicketId;
    }

    // No ticket found - check if MFA is required
    let requiresMfa = false;
    let mfaMethod = 'email';

    // Check for MFA_REQUIRED in responseStatus.type
    if (loginResponse.responseStatus?.type === 'MFA_REQUIRED') {
      requiresMfa = true;
      mfaMethod = loginResponse.customerMfaInfo?.mfaLastMethodUsed || 'email';
    }

    if (requiresMfa) {
      if (!this.mfaCodeProvider) {
        throw new MfaRequiredError();
      }

      const mfaCode = await this.mfaCodeProvider.getMfaCode();
      if (!mfaCode || mfaCode.trim().length === 0) {
        throw new MfaCodeError();
      }

      const mfaResult = await this.verifyMfaCode(mfaCode.trim(), mfaMethod);

      if (mfaResult.serviceTicketId) {
        return mfaResult.serviceTicketId;
      }

      throw new MfaCodeInvalidError('MFA code submitted but ticket not found - please check your MFA code');
    }

    throw new InvalidCredentialsError('login failed (Ticket not found or MFA), please check username and password');
  }

  // Verifies a multi-factor authentication code
  // Returns the authentication response containing the login ticket
  // Throws MfaCodeInvalidError if the MFA code is invalid or expired
  private async verifyMfaCode(mfaCode: string, mfaMethod: string = 'email'): Promise<LoginResponse> {
    const mfaUrl = this.urls.MFA_VERIFY_API();

    const mfaBody = {
      mfaMethod,
      mfaVerificationCode: mfaCode,
      rememberMyBrowser: false,
      reconsentList: [],
      mfaSetup: false,
    };

    try {
      const response = await this.post<unknown>(mfaUrl, mfaBody, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
          Origin: this.urls.GARMIN_SSO_ORIGIN,
          Referer: this.urls.MFA_REFERER(),
          'User-Agent': USER_AGENT_MOBILE_IOS,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        },
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
      if (error instanceof HttpError) {
        // Check responseStatus.type for MFA-specific errors if available
        if (error.responseData) {
          const errorResponse = LoginResponseSchema.safeParse(error.responseData);
          if (errorResponse.success && errorResponse.data.responseStatus) {
            const responseStatus = errorResponse.data.responseStatus;
            if (responseStatus.type === 'SESSION_EXPIRED') {
              throw new MfaCodeInvalidError('Session expired. Please try logging in again.');
            }
          }
        }
        // Fallback to status code check
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw new MfaCodeInvalidError('Invalid MFA code');
        }
        // Handle 409 Conflict (session expired)
        if (error.statusCode === 409) {
          throw new MfaCodeInvalidError('Session expired. Please try logging in again.');
        }
      }
      throw error;
    }
  }

  // Exchanges a login ticket for an OAuth 1.0 token
  // Uses OAuth 1.0a signing to authenticate the request
  // Returns OAuth 1.0 token containing oauth_token and oauth_token_secret
  private async getOauth1Token(ticket: string): Promise<OAuth1Token> {
    const oauthParams = {
      ticket,
      'login-url': this.urls.MOBILE_SERVICE,
      'accepts-mfa-tokens': true,
    };

    const oauth = this.getOauthClient(this.appOauthIdentity);
    const baseUrl = this.urls.OAUTH_PREAUTHORIZED_BASE();

    const requestData = {
      url: baseUrl,
      method: 'GET',
      data: oauthParams,
    };
    const authData = oauth.authorize(requestData);
    // Convert Authorization object to plain object for URL building
    const authParams = { ...authData } as Record<string, unknown>;
    const url = this.urls.OAUTH_PREAUTHORIZED(oauthParams, authParams);

    const response = await this.get<string>(url, {
      headers: {
        'User-Agent': USER_AGENT_CONNECTMOBILE,
      },
    });
    // Parse the query string response (format: "oauth_token=xxx&oauth_token_secret=yyy")
    const responseParams = new URLSearchParams(response);
    const token: OAuth1Token = {
      oauth_token: responseParams.get('oauth_token') || '',
      oauth_token_secret: responseParams.get('oauth_token_secret') || '',
    };
    return token;
  }

  private getOauthClient(appIdentity: OAuth1AppIdentity): OAuth {
    return new OAuth({
      consumer: appIdentity,
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });
  }

  // Exchanges an OAuth 1.0 token for an OAuth 2.0 bearer token
  //
  // This is the final step in the authentication flow. The OAuth 2.0 token
  // is used for all subsequent API requests via Bearer authentication.
  // Returns OAuth 2.0 bearer token with expiration metadata
  private async exchange(oauth1Token: OAuth1Token): Promise<OAuth2Token> {
    const oauth = this.getOauthClient(this.appOauthIdentity);
    const token = {
      key: oauth1Token.oauth_token,
      secret: oauth1Token.oauth_token_secret,
    };

    const baseUrl = this.urls.OAUTH_EXCHANGE_BASE();
    const requestData = {
      url: baseUrl,
      method: 'POST',
      data: null,
    };

    const step5AuthData = oauth.authorize(requestData, token);
    // Convert Authorization object to plain object for URL building
    const oauthParams = { ...step5AuthData } as Record<string, unknown>;
    const url = this.urls.OAUTH_EXCHANGE(oauthParams);
    const response = await this.post<OAuth2Token>(url, null, {
      headers: {
        'User-Agent': USER_AGENT_CONNECTMOBILE,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return this.setOauth2TokenExpiresAt(response);
  }

  // Adds expiration timestamps to an OAuth 2.0 token
  //
  // Converts relative expiration times (expires_in in seconds) to absolute
  // timestamps for easier expiration checking
  private setOauth2TokenExpiresAt(token: OAuth2Token): OAuth2Token {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + token.expires_in;
    const refreshExpiresAt = now + token.refresh_token_expires_in;

    token.last_update_date = new Date().toISOString();
    token.expires_date = new Date(expiresAt * 1000).toISOString();
    token.expires_at = expiresAt;
    token.refresh_token_expires_at = refreshExpiresAt;
    return token;
  }

  // Refreshes the OAuth 2.0 token using the existing OAuth 1.0 token
  //
  // This method is called automatically by the response interceptor when
  // a 401 error is encountered. Uses promise sharing to prevent concurrent
  // refresh attempts - if a refresh is already in progress, all requests
  // wait for the same promise to avoid duplicate refresh API calls.
  // Throws OAuthTokenError if no OAuth 1.0 token is available for refresh
  private async refreshToken(): Promise<string> {
    if (!this.oauth1Token) {
      throw new OAuthTokenError('No OAuth1 token available for refresh');
    }

    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const newToken = await this.exchange(this.oauth1Token!);
        this.oauth2Token = newToken;
        return newToken.access_token;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = undefined;
      }
    })();

    return this.refreshPromise;
  }

  // Performs an HTTP GET request
  // The Bearer token is automatically added via the request interceptor
  // Throws HttpError if the request fails
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  // Performs an HTTP POST request
  // The Bearer token is automatically added via the request interceptor
  // Throws HttpError if the request fails
  async post<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  // Performs an HTTP PUT request
  // The Bearer token is automatically added via the request interceptor
  // Throws HttpError if the request fails
  async put<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  // Performs an HTTP DELETE request
  //
  // Note: The Garmin API uses POST with X-Http-Method-Override header for DELETE requests.
  // The Bearer token is automatically added via the request interceptor.
  // Throws HttpError if the request fails
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, null, {
      ...config,
      headers: {
        ...config?.headers,
        'X-Http-Method-Override': 'DELETE',
      },
    });
    return response.data;
  }

  // Converts an axios response error to an HttpError
  // Always throws an HttpError
  handleError(response: AxiosResponse): void {
    const { status, statusText, data } = response;
    const msg = `ERROR: (${status}), ${statusText}, ${JSON.stringify(data)}`;
    throw new HttpError(msg, status, statusText, data);
  }

  // Checks if the client is authenticated (has valid OAuth tokens)
  // Returns true if both OAuth 1.0 and 2.0 tokens are present
  isAuthenticated(): boolean {
    return !!(this.oauth1Token && this.oauth2Token);
  }
}
