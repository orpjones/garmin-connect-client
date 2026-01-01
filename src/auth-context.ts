export enum MfaMethod {
  EMAIL = 'email',
  SMS = 'sms',
  PHONE = 'phone',
}

// Helper function to convert string to MfaMethod enum
// Falls back to EMAIL if the string doesn't match any known method
export function parseMfaMethod(method: string): MfaMethod {
  const normalized = method.toLowerCase();
  if (normalized === 'email') return MfaMethod.EMAIL;
  if (normalized === 'sms') return MfaMethod.SMS;
  if (normalized === 'phone') return MfaMethod.PHONE;
  // Default to email if unknown method
  return MfaMethod.EMAIL;
}

import type { OAuth1Token, OAuth2Token } from './types';

export class AuthContext {
  readonly mfaRequired: boolean;
  readonly mfaMethod?: MfaMethod;
  private readonly cookies: string;
  private readonly ticket?: string;
  private readonly oauth1Token?: OAuth1Token;
  private readonly oauth2Token?: OAuth2Token;

  constructor(
    mfaRequired: boolean,
    cookies: string,
    mfaMethod?: MfaMethod,
    ticket?: string,
    oauth1Token?: OAuth1Token,
    oauth2Token?: OAuth2Token
  ) {
    this.mfaRequired = mfaRequired;
    this.mfaMethod = mfaMethod;
    this.cookies = cookies;
    this.ticket = ticket;
    this.oauth1Token = oauth1Token;
    this.oauth2Token = oauth2Token;
  }

  // Internal: Gets the cookies as JSON string
  // Used internally - not part of public API
  getCookies(): string {
    return this.cookies;
  }

  // Internal: Gets the ticket if available
  // Used internally - not part of public API
  getTicket(): string | undefined {
    return this.ticket;
  }

  // Internal: Gets OAuth tokens if both are available
  // Used internally - not part of public API
  getOAuthTokens(): { oauth1Token: OAuth1Token; oauth2Token: OAuth2Token } | undefined {
    if (this.oauth1Token && this.oauth2Token) {
      return { oauth1Token: this.oauth1Token, oauth2Token: this.oauth2Token };
    }
    return undefined;
  }
}
