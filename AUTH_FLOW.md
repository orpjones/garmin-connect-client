# Garmin Connect Widget SSO Login — Reference Notes

Reference for rebuilding the authentication flow. Captures the non-obvious bits
that aren't easily derived from Garmin's docs.

## High-level flow

Garmin's SSO embed widget login. No `clientId` query parameter — bypasses
per-client rate limiting. Must use Chrome TLS fingerprinting (libcurl-impersonate)
to get past Cloudflare.

```
1. GET  /sso/embed                           → establish session cookies
2. GET  /sso/signin                          → scrape CSRF token from form
3. POST /sso/signin                          → submit credentials + CSRF
   ├─ title === "Success"      → extract ticket, exchange for tokens
   ├─ title.includes("MFA")    → return MFA-pending state (serializable)
   └─ locked/invalid/error/... → InvalidCredentialsError
4. POST /sso/verifyMFA/loginEnterMfaCode     → only if MFA required
5. GET  OAUTH_PREAUTHORIZED(ticket, ...)     → OAuth1 token (may include mfa_token)
6. OAuth1 → OAuth2 exchange                  → two variants, see below
```

## Dependencies

- `node-libcurl-ja3` — libcurl-impersonate bindings, exports `Curl`, `Browser`,
  `getCurlOptionsFromBrowser`. Used for the widget HTML steps (1–4) to get
  Chrome TLS fingerprint. No axios for those — CF will block it.
- `axios` — still used for the OAuth token exchange POSTs (steps 5–6), because
  services.garmin.com and connectapi.garmin.com don't CF-block non-browser TLS.
- `tough-cookie` — cookie jar used by `HttpClient` (post-auth API calls).
- `oauth-1.0a` — OAuth 1.0a signing for the legacy exchange path.
- `zod` — response validation for `OAuth1Token`, `OAuth2Token`,
  `ConnectExchangeResponse`.

## CurlSession (in authentication-service.ts)

Small wrapper around `node-libcurl-ja3` that persists cookies between requests
within a session. Key details:

- Constructor takes a `Browser` enum value (defaults to `Browser.Chrome`) and
  calls `getCurlOptionsFromBrowser(browser)` to get TLS/HTTP impersonation opts.
- Static factory `CurlSession.withCookies(cookieLines)` for resuming after MFA.
- Per-request:
  - Applies all browser opts via `curl.setOpt(opt, val)` in a try/catch (some
    options may not be supported — skip silently).
  - `COOKIEFILE` set to `''` to enable cookie engine (in-memory).
  - Re-applies every stored cookie via `curl.setOpt('COOKIELIST', line)` before
    each request (libcurl starts fresh per-instance).
  - On `end` event: reads `curl.getInfo('COOKIELIST') as unknown as string[]`
    and stores it back. This is the Netscape tab-delimited format.
  - Default headers (Accept, Accept-Language, Accept-Encoding) are always sent.
- `getCookies() / getCookieJar()` returns a defensive copy of the Netscape
  cookie lines. These are the ONLY cookie representation we store — no manual
  parsing. `HttpClient` converts to/from tough-cookie at its boundary via
  `cookieJarFromNetscape` / `cookieJarToNetscape`.

### Netscape cookie format (for HttpClient interop)

Tab-delimited, 7 fields per line:
```
domain  includeSubdomains  path  secure  expires  name  value
```
- Lines starting with `#` are comments, EXCEPT `#HttpOnly_<domain>` which is
  libcurl's convention for marking HttpOnly cookies.
- `domain` starting with `.` means includeSubdomains=TRUE (hostOnly=false in
  tough-cookie).
- `expires` is a unix timestamp in seconds; `0` means session cookie.

## HTML scraping regexes

Kept close to the functions that use them:

```ts
const CSRF_RE   = /name="_csrf"\s+value="(.+?)"/;
const TITLE_RE  = /<title>(.+?)<\/title>/;
const TICKET_RE = /embed\?ticket=([^"]+)"/;
```

- `extractCsrf(html)` — throws if not found. Called on both the signin page and
  the post-credentials response (need a fresh CSRF for MFA submit).
- `extractTitle(html)` — used to branch the credential POST response:
  - `"Success"` → ticket is present, extract and proceed
  - contains `"MFA"` → return MFA-pending state
  - contains `locked`/`invalid`/`error`/`incorrect` → InvalidCredentialsError
  - anything else → generic Error
- `extractTicket(html)` — regex assumes the form `embed?ticket=XXX"`.

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

## LoginResult (public API)

Discriminated union, fully serializable (no closures, no class instances).
Server-safe — can be JSON.stringify'd, sent across request boundaries, stored
in a DB, etc.

```ts
export type LoginResult =
  | { mfaRequired: false; session: ConnectSession }
  | { mfaRequired: true; mfaMethod: string; cookieJar: string[]; csrfToken: string };
```

`ConnectSession` is:
```ts
interface ConnectSession {
  cookies: string[];          // Netscape-format lines
  oauth1Token: OAuth1Token;
  oauth2Token: OAuth2Token;
}
```

`submitMfa(urls, cookieJar, csrfToken, mfaCode)` rebuilds a `CurlSession` via
`CurlSession.withCookies(cookieJar)` and proceeds with the MFA POST.

## Ticket → OAuth1 exchange

Standard preauthorized endpoint, OAuth 1.0a signed GET. The only unusual bit:

```ts
const oauthParams = {
  ticket,
  'login-url': `${urls.SSO_BASE}/embed`,   // NOTE: widget uses SSO_BASE/embed
  'accepts-mfa-tokens': true,               // critical — enables new flow
};
```

`accepts-mfa-tokens: true` causes Garmin to return an `mfa_token` alongside
`oauth_token`/`oauth_token_secret` when the account is enrolled in the new
flow. Without this, you get the legacy token shape only.

Response is `application/x-www-form-urlencoded` — parse with
`URLSearchParams(resp.body)`, then `OAuth1TokenSchema.parse(raw)`.

## OAuth1 → OAuth2 exchange (two variants)

Dispatched by `exchangeOAuth2Token()`:

### New flow (when `mfa_token` is present)

Two-step. Mirrors the current Garmin iOS app.

**Step A** — `getConnectAccessToken()`:
- POST to `urls.OAUTH_CONNECT_EXCHANGE()` (services.garmin.com).
- Body: `client_id=GARMIN_CONNECT_MOBILE_IOS&connect_access_token=<oauth_token>&sso_mfa_token=<mfa_token>`
- Headers:
  - `Content-Type: application/x-www-form-urlencoded`
  - `User-Agent: GCM-iOS-5.23.11`
  - `x-garmin-client-id: GARMIN_CONNECT_MOBILE_IOS`
- Response: `{ access_token: string }` — validated via `ConnectExchangeResponseSchema`.

**Step B** — `exchangeWithMfaToken()`:
- POST to `urls.OAUTH_EXCHANGE_BASE()`.
- Body: `mfa_token=<mfa_token>&audience=GARMIN_CONNECT_MOBILE_IOS_DI`
- Headers:
  - `Content-Type: application/x-www-form-urlencoded`
  - `User-Agent: GCM-iOS-5.23.11`
  - `Authorization: Bearer <connectAccessToken from step A>`
- Response: full OAuth2 token JSON → `OAuth2TokenSchema.parse` → `setOauth2TokenExpiresAt`.

### Legacy flow (no `mfa_token`)

Traditional OAuth 1.0a signed POST to `urls.OAUTH_EXCHANGE_BASE()`. Signing via
`oauth-1.0a` lib. Auth params appended as query string (legacy signed-URL
pattern — Garmin accepts them either in Authorization header or as query).
Headers: `User-Agent: com.garmin.android.apps.connectmobile` (CONNECTMOBILE),
`Content-Type: application/x-www-form-urlencoded`.

## HttpStatus constants (local)

Defined at the top of authentication-service.ts — no shared enum:
```ts
const HttpStatus = {
  UNAUTHORIZED: 401,
  TOO_MANY_REQUESTS: 429,
  BAD_REQUEST: 400,
} as const;
```
Used to branch on curl response status (`.status` is the raw HTTP code).

## User agents / client IDs

```ts
USER_AGENT_CONNECTMOBILE = 'com.garmin.android.apps.connectmobile'   // legacy OAuth1 exchange
USER_AGENT_GCM_IOS       = 'GCM-iOS-5.23.11'                          // new MFA-token exchange
GARMIN_CLIENT_ID_IOS     = 'GARMIN_CONNECT_MOBILE_IOS'                // new MFA-token exchange
```

`USER_AGENT_MOBILE_IOS` (from oauth-utils) is no longer used — it was the old
login API user agent.

## GarminUrls additions (src/urls.ts)

The widget flow needed these new endpoints:
```
SSO_BASE                = 'https://sso.garmin.com/sso'
CONNECT_WEB_SERVICE     = 'https://connect.garmin.com'
SERVICES_API            = 'https://services.garmin.com'

SSO_EMBED()             → `${SSO_BASE}/embed?...`
SSO_SIGNIN()            → `${SSO_BASE}/signin?...`
SSO_MFA_VERIFY()        → `${SSO_BASE}/verifyMFA/loginEnterMfaCode?...`
OAUTH_CONNECT_EXCHANGE()→ `${SERVICES_API}/api/oauth/connect/exchange`
CONNECT_SIGN_IN_PAGE()  → connect.garmin.com signin landing (used by some flows)
```
`urls` is threaded as a parameter through every auth function — no global/
hardcoded URLs.

## Public API (src/index.ts)

Three plain functions. Intermediate results are serializable so they can be
persisted across server request boundaries:

```ts
export async function login(config): Promise<LoginResult>;
export async function submitMfa(
  loginResult: LoginResult & { mfaRequired: true },
  mfaCode: string
): Promise<ConnectSession>;
export function createClient(session: ConnectSession): GarminConnectClient;
```

Internals: `login` / `submitMfa` each construct a fresh `GarminUrls` instance
and delegate to the auth-service versions. `createClient` calls
`GarminConnectClientImpl.fromSession(session)` — the only factory on the
client class.

## Zod schemas (src/types.ts — single source of truth)

```ts
OAuth1TokenSchema              // oauth_token, oauth_token_secret, mfa_token?
OAuth2TokenSchema              // .passthrough() — keeps unknown fields
ConnectExchangeResponseSchema  // { access_token }
```

Types derived via `z.infer<typeof ...>`. `oauth-utils.ts` imports the type
`OAuth2Token` from types.ts — no duplicate interface.

## Files touched by the rewrite

- `src/authentication-service.ts` — full rewrite; `CurlSession` + widget flow + exchange functions
- `src/http-client.ts` — `cookieJarFromNetscape` / `cookieJarToNetscape` replace Set-Cookie helpers; `getSession` returns `cookies: string[]`
- `src/types.ts` — zod schemas for OAuth tokens + exchange response; `ConnectSession` with `cookies: string[]`
- `src/urls.ts` — new SSO/services endpoints
- `src/oauth-utils.ts` — schemas removed (moved to types.ts); keeps helper functions only
- `src/client.ts` — `fromSession` is the only factory; removed `create`/`createUnauthenticated`
- `src/index.ts` — three-function public API
- `src/auth-context.ts` — trimmed to just `MfaMethod` enum + `parseMfaMethod`
- `package.json` / `package-lock.json` — `node-libcurl-ja3` dep added

## Known rough edges to address on the next pass

- `src/client.test.ts` still targets the old API (`create`, `createAuthContext`,
  `createFromSession`) and will fail until rewritten.
- `auth-context.ts` is only consumed by tests now — fold it into whichever
  module ends up owning MFA method naming, or delete once tests are updated.
- The legacy OAuth1→OAuth2 exchange is kept as a fallback but may not be
  exercised in practice — verify before deleting.
- Consider replacing axios entirely with fetch for the three OAuth exchange
  POSTs (no cookies needed on those calls; would drop a dep from that module).
