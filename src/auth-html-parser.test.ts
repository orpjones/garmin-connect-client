import { describe, expect, it } from 'vitest';

import { parseCsrfToken, parseSsoPostResponse } from './auth-html-parser';
import { CsrfTokenError } from './errors';

describe('parseCsrfToken', () => {
  it('extracts token from a signin form', () => {
    const html = `
      <form method="post" action="/sso/signin">
        <input type="hidden" name="_csrf" value="abc123-def456" />
        <input type="text" name="username" />
      </form>
    `;
    expect(parseCsrfToken(html)).toBe('abc123-def456');
  });

  it('is case-insensitive on the attribute', () => {
    const html = `<input NAME="_csrf" VALUE="TOKEN" />`;
    expect(parseCsrfToken(html)).toBe('TOKEN');
  });

  it('throws CsrfTokenError when the token is missing', () => {
    expect(() => parseCsrfToken('<form></form>')).toThrow(CsrfTokenError);
  });
});

describe('parseSsoPostResponse', () => {
  it('returns success with extracted ticket when title is Success', () => {
    const html = `
      <html><head><title>Success</title></head>
      <body>
        <script>window.location.replace("https://connect.garmin.com/modern?ticket=ST-1234-abcdef-cas");</script>
      </body></html>
    `;
    const result = parseSsoPostResponse(html);
    expect(result).toEqual({ type: 'success', ticket: 'ST-1234-abcdef-cas' });
  });

  it('returns error when title is Success but no ticket is present', () => {
    const html = `<html><head><title>Success</title></head><body></body></html>`;
    const result = parseSsoPostResponse(html);
    expect(result.type).toBe('error');
  });

  it('returns mfa_required when title mentions MFA', () => {
    const html = `<html><head><title>GARMIN Authentication - MFA</title></head></html>`;
    expect(parseSsoPostResponse(html)).toEqual({ type: 'mfa_required' });
  });

  it('classifies locked accounts', () => {
    const html = `
      <html><head><title>Sign In</title></head>
      <body><div class="login-error">Your account has been locked out.</div></body></html>
    `;
    const result = parseSsoPostResponse(html);
    expect(result.type).toBe('locked');
    expect(result.type === 'locked' ? result.message : '').toMatch(/locked/i);
  });

  it('classifies invalid credentials', () => {
    const html = `
      <html><head><title>Sign In</title></head>
      <body><div class="login-error">Invalid username or password.</div></body></html>
    `;
    const result = parseSsoPostResponse(html);
    expect(result.type).toBe('invalid');
  });

  it('falls back to generic error when no classifier matches', () => {
    const html = `<html><head><title>Oops</title></head><body></body></html>`;
    const result = parseSsoPostResponse(html);
    expect(result.type).toBe('error');
  });
});
