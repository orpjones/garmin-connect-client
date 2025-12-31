import qs from 'qs';

// Garmin Connect URL constants and construction methods
export class GarminUrls {
  readonly GARMIN_SSO_ORIGIN = 'https://sso.garmin.com';
  readonly OAUTH_URL = 'https://connectapi.garmin.com/oauth-service/oauth';
  // Mobile API endpoints
  readonly MOBILE_API_LOGIN = 'https://sso.garmin.com/mobile/api/login';
  readonly MOBILE_API_MFA_VERIFY = 'https://sso.garmin.com/mobile/api/mfa/verifyCode';
  readonly MOBILE_SERVICE = 'https://mobile.integration.garmin.com/gcm/ios';
  // Activity API endpoints
  readonly ACTIVITY_BASE = 'https://connectapi.garmin.com/activitylist-service';
  
  // Client ID for mobile API authentication
  readonly CLIENT_ID_MOBILE = 'GCM_IOS_DARK';
  
  // Constructs the sign-in page URL with query parameters
  SIGN_IN_PAGE(clientId: string = this.CLIENT_ID_MOBILE): string {
    const params = {
      clientId,
      service: this.MOBILE_SERVICE,
    };
    return `https://sso.garmin.com/mobile/sso/en-US/sign-in?${qs.stringify(params)}`;
  }
  
  // Constructs the login API URL with query parameters
  LOGIN_API(clientId: string = this.CLIENT_ID_MOBILE, locale: string = 'en-US'): string {
    const params = {
      clientId,
      locale,
      service: this.MOBILE_SERVICE,
    };
    return `${this.MOBILE_API_LOGIN}?${qs.stringify(params)}`;
  }
  
  // Constructs the MFA verify API URL with query parameters
  MFA_VERIFY_API(clientId: string = this.CLIENT_ID_MOBILE, locale: string = 'en-US'): string {
    const params = {
      clientId,
      locale,
      service: this.MOBILE_SERVICE,
    };
    return `${this.MOBILE_API_MFA_VERIFY}?${qs.stringify(params)}`;
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
  OAUTH_PREAUTHORIZED(params: Record<string, unknown>, oauthParams?: Record<string, unknown>): string {
    const baseUrl = this.OAUTH_PREAUTHORIZED_BASE();
    const mergedParams = oauthParams ? { ...params, ...oauthParams } : params;
    return `${baseUrl}?${qs.stringify(mergedParams)}`;
  }
  
  // Returns the base URL for OAuth exchange endpoint (without query params)
  // Used for OAuth signing before building the final URL with query params
  OAUTH_EXCHANGE_BASE(): string {
    return `${this.OAUTH_URL}/exchange/user/2.0`;
  }
  
  // Constructs the OAuth exchange URL with query parameters
  // @param oauthParams - OAuth signature parameters
  OAUTH_EXCHANGE(oauthParams: Record<string, unknown>): string {
    const baseUrl = this.OAUTH_EXCHANGE_BASE();
    return `${baseUrl}?${qs.stringify(oauthParams)}`;
  }
  
  // Activity API methods
  ACTIVITY_SEARCH(start = 0, limit = 20): string {
    return `${this.ACTIVITY_BASE}/activities/search/activities?start=${start}&limit=${limit}`;
  }
  
  ACTIVITY_DETAIL(activityId: string | number): string {
    return `${this.ACTIVITY_BASE}/activities/${activityId}`;
  }
}
