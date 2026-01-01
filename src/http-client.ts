// HTTP client for Garmin Connect API requests.
//
// Handles token management and HTTP requests. This class:
// - Manages OAuth token storage and lifecycle
// - Automatically refreshes expired tokens
// - Makes authenticated HTTP requests to the Garmin Connect API
//
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

import { AuthContext } from './auth-context';
import { HttpError, NotAuthenticatedError, OAuthTokenError } from './errors';
import {
  USER_AGENT_CONNECTMOBILE,
  getAppOauthIdentity,
  createOauthClient,
  setOauth2TokenExpiresAt,
} from './oauth-utils';
import type { OAuth1Token, OAuth2Token } from './types';
import { GarminUrls } from './urls';

export class HttpClient {
  private client: AxiosInstance;
  // OAuth 1.0 token used for refreshing the OAuth 2.0 token
  private oauth1Token?: OAuth1Token;
  // OAuth 2.0 bearer token used for authenticated API requests
  private oauth2Token?: OAuth2Token;
  private urls: GarminUrls;
  // Cookie jar for session management
  private cookieJar: CookieJar;
  // Flag to prevent concurrent token refresh attempts
  private isRefreshing = false;
  // Shared promise for concurrent refresh requests to avoid duplicate refresh calls
  private refreshPromise?: Promise<string>;

  constructor(urls: GarminUrls, authContext?: AuthContext, cookies?: string) {
    this.urls = urls;
    // Prefer AuthContext if provided, otherwise use cookies string, otherwise empty
    if (authContext) {
      this.cookieJar = HttpClient.createCookieJarFromJson(authContext.getCookies());
      const tokens = authContext.getOAuthTokens();
      if (tokens) {
        this.oauth1Token = tokens.oauth1Token;
        this.oauth2Token = tokens.oauth2Token;
      }
    } else if (cookies) {
      this.cookieJar = HttpClient.createCookieJarFromJson(cookies);
    } else {
      this.cookieJar = new CookieJar();
    }
    this.client = wrapper(axios.create({ jar: this.cookieJar }));

    this.setupInterceptors();
  }

  // Gets serialized cookie jar data as JSON string for storage/transmission
  // Returns a JSON string that can be restored with setCookies
  getCookies(): string {
    return JSON.stringify(this.cookieJar.toJSON());
  }

  // Sets cookies from a JSON string (used during authentication flow)
  // This allows restoring cookies from a previous session
  setCookies(cookies: string): void {
    this.cookieJar = HttpClient.createCookieJarFromJson(cookies);
    // Recreate the axios client with the new cookie jar
    this.client = wrapper(axios.create({ jar: this.cookieJar }));
    // Re-setup interceptors on the new client instance
    this.setupInterceptors();
  }

  // Helper to create a CookieJar from JSON string
  private static createCookieJarFromJson(json: string): CookieJar {
    return CookieJar.fromJSON(json);
  }

  // Sets up request and response interceptors
  private setupInterceptors(): void {
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

          // Only attempt token refresh if we have tokens (authenticated API request)
          if (status === 401 && originalRequest && !originalRequest._retry && this.oauth2Token && this.oauth1Token) {
            originalRequest._retry = true;
            const newToken = await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          }

          // Map 403 Forbidden to NotAuthenticatedError (Garmin uses 403 for unauthenticated requests)
          if (status === 403) {
            throw new NotAuthenticatedError(`Request failed: ${error.message}`);
          }

          // Map 400 Bad Request with authorization error message to NotAuthenticatedError
          if (
            status === 400 &&
            data &&
            typeof data === 'object' &&
            'errorMessage' in data &&
            data.errorMessage === 'Authorization header is missing or incomplete.'
          ) {
            throw new NotAuthenticatedError(`Request failed: ${error.message}`);
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

  // Exchanges an OAuth 1.0 token for an OAuth 2.0 bearer token
  //
  // This is used internally for token refresh when tokens expire.
  // Returns OAuth 2.0 bearer token with expiration metadata
  private async exchange(oauth1Token: OAuth1Token): Promise<OAuth2Token> {
    const appOauthIdentity = getAppOauthIdentity();
    const oauth = createOauthClient(appOauthIdentity);
    const token = {
      key: oauth1Token.oauth_token,
      secret: oauth1Token.oauth_token_secret,
    };

    const baseUrl = this.urls.OAUTH_EXCHANGE_BASE();
    const requestData = {
      url: baseUrl,
      method: 'POST',
    };

    const step5AuthData = oauth.authorize(requestData, token);
    // Convert Authorization object to plain object for URL building
    const oauthParameters = { ...step5AuthData } as Record<string, unknown>;
    const url = this.urls.OAUTH_EXCHANGE(oauthParameters);
    const response = await this.post<OAuth2Token>(url, undefined, {
      headers: {
        'User-Agent': USER_AGENT_CONNECTMOBILE,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return setOauth2TokenExpiresAt(response);
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

    const oauth1Token = this.oauth1Token;
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const newToken = await this.exchange(oauth1Token);
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
    const response = await this.client.post<T>(url, undefined, {
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
    const message = `ERROR: (${status}), ${statusText}, ${JSON.stringify(data)}`;
    throw new HttpError(message, status, statusText, data);
  }
}
