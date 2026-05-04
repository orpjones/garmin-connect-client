// Pure-function parsers for Garmin's auth HTML responses.
//
// The SSO embed login flow returns HTML pages rather than JSON. These helpers
// exist so the parsing logic is trivially unit-testable without any network or
// libcurl machinery.

import { CsrfTokenError } from './errors';

export type SsoPostResult =
  | { type: 'success'; ticket: string }
  | { type: 'mfa_required' }
  | { type: 'locked'; message?: string }
  | { type: 'invalid'; message?: string }
  | { type: 'error'; message?: string };

// Extracts the `_csrf` token from the signin / MFA form HTML.
// Throws CsrfTokenError when the token is missing.
export function parseCsrfToken(html: string): string {
  const match = /name="_csrf"\s+value="([^"]+)"/i.exec(html);
  if (!match) {
    throw new CsrfTokenError();
  }
  return match[1];
}

// Classifies the response to a credentials or MFA POST.
//
// The SSO embed login form encodes outcome in the <title> element:
//   - "Success"             → extract service ticket from response URL
//   - title contains "MFA"  → MFA challenge required
//   - anything else         → error (locked / invalid / generic)
export function parseSsoPostResponse(html: string): SsoPostResult {
  const title = extractTitle(html);

  if (title === 'Success') {
    const ticket = extractTicket(html);
    if (!ticket) {
      return { type: 'error', message: 'Login reported success but ticket not found in response' };
    }
    return { type: 'success', ticket };
  }

  if (title && /mfa/i.test(title)) {
    return { type: 'mfa_required' };
  }

  const message = extractErrorMessage(html) ?? title ?? undefined;
  if (message && /lock/i.test(message)) {
    return { type: 'locked', message };
  }
  if (message && /(invalid|incorrect|wrong|password|credentials)/i.test(message)) {
    return { type: 'invalid', message };
  }
  return { type: 'error', message };
}

// --- helpers -----------------------------------------------------------------

function extractTitle(html: string): string | undefined {
  const match = /<title>([^<]*)<\/title>/i.exec(html);
  return match ? match[1].trim() : undefined;
}

// Garmin's SSO embed login form embeds the post-login redirect URL in one of two forms:
//   var response_url = "https://...?ticket=...";
//   window.location.replace("https://...?ticket=...");
// We extract the ticket value from whichever is present.
function extractTicket(html: string): string | undefined {
  const patterns = [/var response_url\s*=\s*"([^"]+)"/i, /window\.location\.replace\("([^"]+)"\)/i];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) {
      const url = match[1].replaceAll('\\/', '/'); // unescape \/ → / in Garmin's JS string literals
      const ticketMatch = /[&?]ticket=([\da-z-]+)/i.exec(url);
      if (ticketMatch) return ticketMatch[1];
    }
  }
  return undefined;
}

// Error copy is usually inside an element with class "login-error" or similar.
// We extract the first non-empty textual error node, falling back to a generic
// status class if the specific one is absent.
function extractErrorMessage(html: string): string | undefined {
  const patterns = [
    /<[^>]*class="[^"]*(?:login-error|error-message|alert)[^"]*"[^>]*>([^<]+)<\/[^>]+>/i,
    /<div[^>]*id="[^"]*error[^"]*"[^>]*>([^<]+)<\/div>/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) {
      const text = match[1].trim();
      if (text.length > 0) {
        return text;
      }
    }
  }
  return undefined;
}
