import { DateTime } from 'luxon';
import { stringify } from 'qs';

// Garmin Connect URL constants and construction methods.
//
// The SSO embed login flow intentionally omits `clientId` from the signin
// endpoints (see docs/authentication.md) to bypass per-client Cloudflare rate limiting.
export class GarminUrls {
  readonly GARMIN_SSO_ORIGIN = 'https://sso.garmin.com';
  readonly SSO_BASE = 'https://sso.garmin.com/sso';
  readonly CONNECT_WEB_SERVICE = 'https://connect.garmin.com/modern';
  readonly CONNECT_API = 'https://connectapi.garmin.com';
  readonly GOLF_API_BASE = 'https://golf.garmin.com/gcs-golfcommunity/api/v2';

  // Common query parameters for the SSO embed login flow. These values are
  // reused for both the initial signin page and the MFA verification step so
  // Garmin treats both requests as part of the same embedded login widget.
  // It mirrors what the embedded login form sends: source, redirect targets,
  // webhost, and gauth host. `clientId` is intentionally absent — see class doc.
  //
  // Important: Garmin binds each service ticket to the exact URL used during
  // login. The ticket is only valid for that URL, so the same `embedUrl`
  // value must be used in both the SSO request parameters and the later token
  // exchange `service_url` parameter. If the URL changes, Garmin treats the
  // ticket as belonging to a different service and rejects it.
  private ssoWidgetParameters(): Record<string, string> {
    const embedUrl = `${this.SSO_BASE}/embed`;
    return {
      service: embedUrl,
      webhost: this.CONNECT_WEB_SERVICE,
      source: embedUrl,
      redirectAfterAccountLoginUrl: embedUrl,
      redirectAfterAccountCreationUrl: embedUrl,
      gauthHost: this.SSO_BASE,
      locale: 'en_US',
      id: 'gauth-widget',
      cssUrl: 'https://connect.garmin.com/gauth-custom-v3.2-min.css',
      privacyStatementUrl: 'https://www.garmin.com/en-US/privacy/connect/',
      rememberMeShown: 'true',
      rememberMeChecked: 'false',
      createAccountShown: 'true',
      openCreateAccount: 'false',
      displayNameShown: 'false',
      consumeServiceTicket: 'false',
      initialFocus: 'true',
      embedWidget: 'true',
      generateExtraServiceTicket: 'true',
      generateTwoExtraServiceTickets: 'true',
      generateNoServiceTicket: 'false',
      globalOptInShown: 'true',
      globalOptInChecked: 'false',
      mobile: 'false',
      connectLegalTerms: 'true',
      showTermsOfUse: 'false',
      showPrivacyPolicy: 'false',
      showConnectLegalAge: 'false',
      locationPromptShown: 'true',
      showPassword: 'true',
      useCustomHeader: 'false',
      mfaRequired: 'false',
      performMFACheck: 'false',
      rememberMyBrowserShown: 'false',
      rememberMyBrowserChecked: 'false',
    };
  }

  // The /sso/embed endpoint establishes initial session cookies before signin.
  SSO_EMBED(): string {
    const parameters = {
      id: 'gauth-widget',
      embedWidget: 'true',
      gauthHost: this.SSO_BASE,
    };
    return `${this.SSO_BASE}/embed?${stringify(parameters)}`;
  }

  // The /sso/signin GET returns the login HTML used to scrape the CSRF token.
  // The POST submits credentials.
  SSO_SIGNIN(): string {
    return `${this.SSO_BASE}/signin?${stringify(this.ssoWidgetParameters())}`;
  }

  // POST endpoint for submitting MFA codes during the SSO embed login flow.
  SSO_MFA_VERIFY(): string {
    return `${this.SSO_BASE}/verifyMFA/loginEnterMfaCode?${stringify(this.ssoWidgetParameters())}`;
  }

  // Device-identity OAuth2 token endpoint — used for both initial ticket exchange and refresh.
  DIAUTH_TOKEN_URL(): string {
    return 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
  }

  // Activity API methods
  ACTIVITY_SEARCH(start = 0, limit = 20): string {
    return `${this.CONNECT_API}/activitylist-service/activities/search/activities?start=${start}&limit=${limit}`;
  }

  ACTIVITY_DETAIL(activityId: string | number): string {
    return `${this.CONNECT_API}/activitylist-service/activities/${activityId}`;
  }

  // Golf API methods
  GOLF_ACTIVITIES(page = 1, perPage = 20, locale = 'en'): string {
    return `${this.GOLF_API_BASE}/activity?user-locale=${locale}&page=${page}&per-page=${perPage}`;
  }

  GOLF_SCORECARD_DETAILS(scorecardId: number, locale = 'en'): string {
    return `${this.GOLF_API_BASE}/scorecard/detail?scorecard-ids=${scorecardId}&skip-course-info=0&skip-stats-info=0&skip-shot-summary-info=1&user-locale=${locale}`;
  }

  // Sleep API methods
  DAILY_SLEEP_DATA(date: DateTime<true>, nonSleepBufferMinutes = 60): string {
    return `${this.CONNECT_API}/sleep-service/sleep/dailySleepData?date=${date.toUTC().toISODate()}&nonSleepBufferMinutes=${nonSleepBufferMinutes}`;
  }

  SLEEP_STATS(from: DateTime<true>, to: DateTime<true>): string {
    return `${this.CONNECT_API}/sleep-service/stats/sleep/daily/${from.toUTC().toISODate()}/${to.toUTC().toISODate()}`;
  }
}
