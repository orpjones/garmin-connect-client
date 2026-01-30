import { stringify } from 'qs';

// Garmin Connect URL constants and construction methods
export class GarminUrls {
  readonly GARMIN_SSO_ORIGIN = 'https://sso.garmin.com';
  readonly OAUTH_URL = 'https://connectapi.garmin.com/oauth-service/oauth';
  // Mobile API endpoints
  readonly MOBILE_API_LOGIN = 'https://sso.garmin.com/mobile/api/login';
  readonly MOBILE_API_MFA_VERIFY = 'https://sso.garmin.com/mobile/api/mfa/verifyCode';
  readonly MOBILE_SERVICE = 'https://mobile.integration.garmin.com/gcm/ios';
  // Connect Api endpoints
  readonly CONNECT_API = 'https://connectapi.garmin.com';
  // Golf API endpoints
  readonly GOLF_API_BASE = 'https://golf.garmin.com/gcs-golfcommunity/api/v2';

  // Client ID for mobile API authentication
  readonly CLIENT_ID_MOBILE = 'GCM_IOS_DARK';

  // Constructs the sign-in page URL with query parameters
  SIGN_IN_PAGE(clientId: string = this.CLIENT_ID_MOBILE): string {
    const parameters = {
      clientId,
      service: this.MOBILE_SERVICE,
    };
    return `https://sso.garmin.com/mobile/sso/en-US/sign-in?${stringify(parameters)}`;
  }

  // Constructs the login API URL with query parameters
  LOGIN_API(clientId: string = this.CLIENT_ID_MOBILE, locale: string = 'en-US'): string {
    const parameters = {
      clientId,
      locale,
      service: this.MOBILE_SERVICE,
    };
    return `${this.MOBILE_API_LOGIN}?${stringify(parameters)}`;
  }

  // Constructs the MFA verify API URL with query parameters
  MFA_VERIFY_API(clientId: string = this.CLIENT_ID_MOBILE, locale: string = 'en-US'): string {
    const parameters = {
      clientId,
      locale,
      service: this.MOBILE_SERVICE,
    };
    return `${this.MOBILE_API_MFA_VERIFY}?${stringify(parameters)}`;
  }

  // Constructs the referer URL for sign-in page requests
  SIGN_IN_REFERER(clientId: string = this.CLIENT_ID_MOBILE): string {
    return `https://sso.garmin.com/mobile/sso/en-US/sign-in?clientId=${clientId}&service=${encodeURIComponent(this.MOBILE_SERVICE)}`;
  }

  // Constructs the referer URL for MFA page requests
  MFA_REFERER(clientId: string = this.CLIENT_ID_MOBILE): string {
    return `https://sso.garmin.com/mobile/sso/en-US/mfa?clientId=${clientId}&service=${encodeURIComponent(this.MOBILE_SERVICE)}`;
  }

  // Returns the base URL for OAuth preauthorized endpoint (without query params)
  // Used for OAuth signing before building the final URL with query params
  OAUTH_PREAUTHORIZED_BASE(): string {
    return `${this.OAUTH_URL}/preauthorized`;
  }

  // Constructs the OAuth preauthorized URL with query parameters
  // @param params - Base parameters (ticket, login-url, accepts-mfa-tokens)
  // @param oauthParams - OAuth signature parameters to merge in
  OAUTH_PREAUTHORIZED(parameters: Record<string, unknown>, oauthParameters?: Record<string, unknown>): string {
    const baseUrl = this.OAUTH_PREAUTHORIZED_BASE();
    const mergedParameters = oauthParameters ? { ...parameters, ...oauthParameters } : parameters;
    return `${baseUrl}?${stringify(mergedParameters)}`;
  }

  // Returns the base URL for OAuth exchange endpoint (without query params)
  // Used for OAuth signing before building the final URL with query params
  OAUTH_EXCHANGE_BASE(): string {
    return `${this.OAUTH_URL}/exchange/user/2.0`;
  }

  // Constructs the OAuth exchange URL with query parameters
  // @param oauthParams - OAuth signature parameters
  OAUTH_EXCHANGE(oauthParameters: Record<string, unknown>): string {
    const baseUrl = this.OAUTH_EXCHANGE_BASE();
    return `${baseUrl}?${stringify(oauthParameters)}`;
  }

  // Activity API methods
  ACTIVITY_SEARCH(start = 0, limit = 20): string {
    return `${this.CONNECT_API}/activitylist-service/activities/search/activities?start=${start}&limit=${limit}`;
  }

  ACTIVITY_DETAIL(activityId: string | number): string {
    return `${this.CONNECT_API}/activitylist-service/activities/${activityId}`;
  }

  // Sleep service
  DAILY_SLEEP(date: string, nonSleepBufferMinutes = 60): string {
    return `${this.CONNECT_API}/sleep-service/sleep/dailySleepData?date=${date}&nonSleepBufferMinutes=${nonSleepBufferMinutes}`;
  }

  // Golf API methods
  GOLF_ACTIVITIES(page = 1, perPage = 20, locale = 'en'): string {
    return `${this.GOLF_API_BASE}/activity?user-locale=${locale}&page=${page}&per-page=${perPage}`;
  }

  GOLF_SCORECARD_DETAILS(scorecardId: number, locale = 'en'): string {
    return `${this.GOLF_API_BASE}/scorecard/detail?scorecard-ids=${scorecardId}&skip-course-info=0&skip-stats-info=0&skip-shot-summary-info=1&user-locale=${locale}`;
  }
}
