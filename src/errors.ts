/**
 * Custom exception classes for Garmin Connect client
 *
 * All exceptions extend GarminConnectError, allowing consumers to catch
 * all library errors with a single catch block, or handle specific error
 * types individually.
 */

/**
 * Base exception class for all Garmin Connect client errors
 */
export class GarminConnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GarminConnectError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    // Ensure instanceof works correctly
    Object.setPrototypeOf(this, GarminConnectError.prototype);
  }
}

/**
 * Base class for authentication-related errors
 */
export class AuthenticationError extends GarminConnectError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Thrown when username/password combination is invalid
 */
export class InvalidCredentialsError extends AuthenticationError {
  constructor(message: string = 'Invalid username or password') {
    super(message);
    this.name = 'InvalidCredentialsError';
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

/**
 * Thrown when CSRF token cannot be found during authentication
 */
export class CsrfTokenError extends AuthenticationError {
  constructor(message: string = 'CSRF token not found during login') {
    super(message);
    this.name = 'CsrfTokenError';
    Object.setPrototypeOf(this, CsrfTokenError.prototype);
  }
}

/**
 * Thrown when a request is made without authentication or session has expired
 */
export class NotAuthenticatedError extends AuthenticationError {
  constructor(message: string = 'Client is not authenticated. Call create() first.') {
    super(message);
    this.name = 'NotAuthenticatedError';
    Object.setPrototypeOf(this, NotAuthenticatedError.prototype);
  }
}

/**
 * Base class for MFA-related errors
 */
export class MfaError extends GarminConnectError {
  constructor(message: string) {
    super(message);
    this.name = 'MfaError';
    Object.setPrototypeOf(this, MfaError.prototype);
  }
}

/**
 * Thrown when MFA is required but no MFA code provider was configured
 */
export class MfaRequiredError extends MfaError {
  constructor(message: string = 'MFA is required but no MFA code provider was configured') {
    super(message);
    this.name = 'MfaRequiredError';
    Object.setPrototypeOf(this, MfaRequiredError.prototype);
  }
}

/**
 * Thrown when MFA code is empty or invalid
 */
export class MfaCodeError extends MfaError {
  constructor(message: string = 'MFA code cannot be empty') {
    super(message);
    this.name = 'MfaCodeError';
    Object.setPrototypeOf(this, MfaCodeError.prototype);
  }
}

/**
 * Thrown when MFA code submission fails or code is incorrect
 */
export class MfaCodeInvalidError extends MfaError {
  constructor(message: string = 'MFA code submission failed - please check your MFA code') {
    super(message);
    this.name = 'MfaCodeInvalidError';
    Object.setPrototypeOf(this, MfaCodeInvalidError.prototype);
  }
}

/**
 * Base class for OAuth-related errors
 */
export class OAuthError extends GarminConnectError {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthError';
    Object.setPrototypeOf(this, OAuthError.prototype);
  }
}

/**
 * Thrown when OAuth app identity (key/secret) is not available
 */
export class OAuthIdentityError extends OAuthError {
  constructor(message: string = 'No OAuth app identity available') {
    super(message);
    this.name = 'OAuthIdentityError';
    Object.setPrototypeOf(this, OAuthIdentityError.prototype);
  }
}

/**
 * Thrown when OAuth token is not available (e.g., for refresh)
 */
export class OAuthTokenError extends OAuthError {
  constructor(message: string = 'No OAuth token available') {
    super(message);
    this.name = 'OAuthTokenError';
    Object.setPrototypeOf(this, OAuthTokenError.prototype);
  }
}

/**
 * Base class for client state errors
 */
export class ClientError extends GarminConnectError {
  constructor(message: string) {
    super(message);
    this.name = 'ClientError';
    Object.setPrototypeOf(this, ClientError.prototype);
  }
}

/**
 * Thrown when a method is not yet implemented
 */
export class NotImplementedError extends ClientError {
  constructor(message: string = 'Not implemented') {
    super(message);
    this.name = 'NotImplementedError';
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}

/**
 * Thrown for HTTP-related errors
 */
export class HttpError extends GarminConnectError {
  public readonly statusCode?: number;
  public readonly statusText?: string;
  public readonly responseData?: unknown;

  constructor(message: string, statusCode?: number, statusText?: string, responseData?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.responseData = responseData;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
