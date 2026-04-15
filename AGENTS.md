# Agent Instructions

This repository is a TypeScript Garmin Connect client. Before changing auth behavior, read the current code paths in [src/authentication-service.ts](./src/authentication-service.ts), [src/http-client.ts](./src/http-client.ts), [src/client.ts](./src/client.ts), [src/auth-context.ts](./src/auth-context.ts), and [src/index.ts](./src/index.ts).

## Current Auth Reality

- The current implementation uses the Garmin SSO login flow to obtain a `serviceTicketId`.
- That ticket is exchanged through Garmin's preauthorized OAuth endpoint for an OAuth 1.0 token, then for an OAuth 2.0 bearer token.
- Session persistence is based on serialized cookies plus OAuth tokens, not browser-request headers.
- The public entry points are `createAuthContext(config)`, `create(context, mfaCode?)`, and `createFromSession(session)`.
- `createAuthContext` returns an `AuthContext` that may contain a login ticket or indicate MFA is required.
- `createFromSession` restores a fully authenticated client from persisted cookies and OAuth tokens without re-running login.

## Preferred Approach

When debugging or extending auth:

1. Start from the existing ticket -> OAuth1 -> OAuth2 flow in `AuthenticationService`.
2. Keep changes narrow across `AuthenticationService`, `HttpClient`, and the exported factory functions.
3. Preserve the current `AuthContext` and persisted-session contract unless an API change is intentional.
4. Validate behavior against the existing tests and build before assuming Garmin's auth contract changed.

## Useful Commands

```bash
npm run build
npm run test:run
npm run lint
```

## Auth Flow Notes

- `AuthenticationService.startAuthentication()` performs the initial login and returns an `AuthContext` discriminated union: either `{ mfaRequired: false, ticket, cookies }` or `{ mfaRequired: true, cookies }`.
- `AuthenticationService.completeAuthentication(urls, context, mfaCode?)` runs the OAuth exchange (posting the MFA code first when `context.mfaRequired`) and returns an authenticated `HttpClient`.
- `HttpClient` stores the cookie jar plus OAuth tokens and refreshes expired OAuth 2.0 tokens using the OAuth 1.0 token (via `OAuth2Exchanger`, which handles both legacy and new-flow refresh based on the presence of `mfa_token`).
- `GarminConnectClientImpl.create()` is the main integration point between `AuthContext` and `AuthenticationService`.

## Editing Guidance

- Preserve existing public API names unless the change explicitly requires an API change.
- Keep auth changes narrow and testable.
- Preserve session persistence behavior in `getSession()` / `createFromSession()` unless the change requires a format migration.
- If auth behavior changes, update both implementation comments and public entry-point docs to stay consistent.

## Validation

At minimum, run:

```bash
npm run build
```

If the change touches authentication or session persistence, also run:

```bash
npm run test:run
```
