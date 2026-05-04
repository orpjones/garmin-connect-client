# Copilot Instructions

See [AGENTS.md](../AGENTS.md) for the canonical project guidance.

Key points:

- The current auth implementation is login ticket -> OAuth1 -> OAuth2, coordinated by `AuthenticationService`.
- Use `createAuthContext(config)`, `create(context, mfaCode?)`, and `createFromSession(session)` as the public auth entry points.
- Session persistence is based on serialized cookies plus OAuth tokens, not browser-session headers.
- Read `src/authentication-service.ts`, `src/http-client.ts`, `src/client.ts`, `src/auth-context.ts`, and `src/index.ts` before changing auth behavior.
- Keep auth changes narrow and validate with `npm run build`.
