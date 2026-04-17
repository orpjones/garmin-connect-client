# Garmin Connect Widget SSO Login — Reference Notes

## Conceptual Overview

The Garmin Connect authentication flow has three stages:

1. **CAS SSO Login** → Service Ticket
   - User logs in via Garmin's Central Authentication Service (SSO)
   - Success returns a signed `serviceTicketId` (short-lived, single-use token)
   - MFA may be required; if so, return a pending state and wait for the code

2. **Device-Identity OAuth2 Exchange** → Bearer Token
   - Exchange the service ticket for an OAuth2 bearer token via `diauth.garmin.com`
   - This token is used for all subsequent API calls to `connectapi.garmin.com`
   - The client ID used in this exchange is stored and reused for token refresh

3. **Session Persistence**
   - Store the OAuth2 token, refresh token, and session cookies
   - On reconnect, use `createFromSession()` to restore the client without re-authenticating

### Key Design Decisions

- **TLS Fingerprinting Required**: Garmin's SSO is behind Cloudflare. Only Chrome TLS fingerprints are allowed, so we use `libcurl-impersonate` for SSO steps (1–4).
- **Device-Identity Rotation**: Garmin rotates client IDs quarterly. We maintain a list and try each in order until one succeeds.
- **No OAuth1**: The flow exchanges the service ticket directly for an OAuth2 bearer token via the device-identity endpoint — no OAuth1 signing involved.

## High-level flow

Garmin's SSO embed login form. No `clientId` query parameter — bypasses
per-client rate limiting. Must use Chrome TLS fingerprinting (libcurl-impersonate)
to get past Cloudflare.

```
1. GET  /sso/embed                           → establish session cookies
2. GET  /sso/signin                          → scrape CSRF token from form
3. POST /sso/signin                          → submit credentials + CSRF
   ├─ title === "Success"      → extract ticket, exchange for device-identity token
   ├─ title.includes("MFA")    → return MFA-pending state (serializable)
   └─ locked/invalid/error/... → InvalidCredentialsError
4. POST /sso/verifyMFA/loginEnterMfaCode     → only if MFA required
5. POST diauth.garmin.com/di-oauth2-service/oauth/token → device-identity OAuth2 bearer token
```

## Dependencies

- `node-libcurl-ja3` — libcurl-impersonate bindings, exports `Curl`, `Browser`,
  `getCurlOptionsFromBrowser`. Used for the SSO embed login steps (1–4) to get
  Chrome TLS fingerprint. No axios for those — CF will block it.
- `axios` — used for the device-identity token exchange POST (step 5) and all Garmin Connect
  API calls; diauth.garmin.com and connectapi.garmin.com don't CF-block non-browser TLS.
- `tough-cookie` — cookie jar used by `HttpClient` (post-auth API calls).
- `zod` — response validation for `OAuth2Token`.

## Credential POST body

```
username=<user>&password=<pass>&embed=true&_csrf=<csrf>
```
Referer: the signin URL. Content-Type: application/x-www-form-urlencoded.

## MFA POST body

```
mfa-code=<code>&embed=true&_csrf=<csrf>&fromPage=setupEnterMfaCode
```
POSTed to `urls.SSO_MFA_VERIFY()`. Success branch is identical to credential
POST success: extract ticket, exchange for session.

## Ticket → device-identity OAuth2 exchange

`exchangeDiToken(urls, ticket)` in `src/oauth2-exchanger.ts`.

- POST `https://diauth.garmin.com/di-oauth2-service/oauth/token`
- `Authorization: Basic base64(<clientId> + ":")`
- Body:
  ```
  grant_type=https://connectapi.garmin.com/di-oauth2-service/oauth/grant/service_ticket
  &service_ticket=<ticket>
  &service_url=https://sso.garmin.com/sso/embed
  &client_id=<clientId>
  ```
- `service_url` must match the URL the ticket was issued for — `ssoWidgetParameters()`
  sets `service: embedUrl` so the ticket is always issued for `SSO_BASE/embed`.
- Client IDs tried in order (`DI_CLIENT_IDS` in oauth-utils.ts):
  1. `GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2`
  2. `GARMIN_CONNECT_MOBILE_ANDROID_DI_2024Q4`
  3. `GARMIN_CONNECT_MOBILE_ANDROID_DI`
  4. `GARMIN_CONNECT_MOBILE_IOS_DI`
- Response: standard OAuth2 JSON (`access_token`, `expires_in`, `refresh_token`, …)

## Token refresh

`refreshDiToken(urls, refreshToken, diClientId)` — same endpoint, same client ID:
```
grant_type=refresh_token&refresh_token=<token>&client_id=<id>
```
The `diClientId` that succeeded during initial exchange is stored in `PersistedSession`
and reused for refresh.

## GarminUrls (src/urls.ts)

```
SSO_BASE            = 'https://sso.garmin.com/sso'
CONNECT_WEB_SERVICE = 'https://connect.garmin.com/modern'

SSO_EMBED()         → `${SSO_BASE}/embed?...`
SSO_SIGNIN()        → `${SSO_BASE}/signin?...`
SSO_MFA_VERIFY()    → `${SSO_BASE}/verifyMFA/loginEnterMfaCode?...`
DIAUTH_TOKEN_URL()  → `https://diauth.garmin.com/di-oauth2-service/oauth/token`
```
`urls` is threaded as a parameter through every auth function — no global/
hardcoded URLs.
