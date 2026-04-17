// HTTP transport client using node-libcurl-ja3 with Chrome impersonation.
//
// Garmin's sso.garmin.com endpoints are fronted by Cloudflare which blocks
// non-browser TLS fingerprints. Impersonating Chrome allows requests to pass CF.
// Cookies are held in a per-instance temp file (libcurl's native cookie engine),
// then serializable as an opaque string so sessions can be resumed across calls.

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { Browser, curly, type CurlyFunction } from 'node-libcurl-ja3';

import { HttpError } from './errors';

export class CurlClient {
  private readonly cookieFile: string;
  private readonly client: CurlyFunction;

  constructor(serializedCookies?: string) {
    this.cookieFile = path.join(os.tmpdir(), `garmin-curl-${crypto.randomUUID()}.cookies`);
    if (serializedCookies && serializedCookies.length > 0) {
      fs.writeFileSync(this.cookieFile, serializedCookies, 'utf8');
    }
    this.client = curly.impersonate(Browser.Chrome, {
      cookieFile: this.cookieFile,
      cookieJar: this.cookieFile,
      followLocation: true,
      sslVerifyPeer: true,
      // Disable curly's built-in content-type body parsers so we always receive
      // a raw Buffer. Garmin occasionally returns JSON error bodies (e.g. the
      // Cloudflare 429) which would otherwise be auto-parsed into an object
      // and break our HTML parser downstream.
      curlyResponseBodyParser: false,
    });
  }

  async get(url: string, options: { headers?: string[] } = {}): Promise<string> {
    return this.request('get', url, options);
  }

  async post(
    url: string,
    body: string,
    options: { headers?: string[]; allowClientError?: boolean } = {}
  ): Promise<string> {
    return this.request('post', url, { ...options, body });
  }

  // Serializes the current libcurl cookie state to an opaque string that can
  // seed another CurlClient instance. Used to carry sessions across call boundaries.
  getCookies(): string {
    if (!fs.existsSync(this.cookieFile)) {
      return '';
    }
    return fs.readFileSync(this.cookieFile, 'utf8');
  }

  // Removes the backing cookie file. Call when the session is complete.
  close(): void {
    try {
      if (fs.existsSync(this.cookieFile)) {
        fs.unlinkSync(this.cookieFile);
      }
    } catch {
      // Best-effort cleanup; temp file will be reaped by the OS.
    }
  }

  private async request(
    method: 'get' | 'post',
    url: string,
    options: { body?: string; headers?: string[]; allowClientError?: boolean } = {}
  ): Promise<string> {
    const curlOptions: Record<string, unknown> = {};
    if (options.headers) {
      curlOptions.httpHeader = options.headers;
    }
    if (options.body !== undefined) {
      curlOptions.postFields = options.body;
    }

    const response = await this.client[method]<Buffer>(url, curlOptions);
    const body = Buffer.isBuffer(response.data) ? response.data.toString('utf8') : String(response.data);

    // 429 (rate limit) and 5xx are never classifiable from an HTML body — always
    // bubble them up as transport errors. Other 4xx responses are allowed
    // through when the caller sets `allowClientError` so the HTML parser can
    // classify bad credentials / locked accounts from the response page.
    const isRateLimited = response.statusCode === 429;
    const isServerError = response.statusCode >= 500;
    const isClientError = response.statusCode >= 400 && response.statusCode < 500;
    if (isRateLimited || isServerError || (isClientError && !options.allowClientError)) {
      throw new HttpError(
        `Curl request failed: ${method.toUpperCase()} ${url} (${response.statusCode})`,
        response.statusCode,
        undefined,
        body
      );
    }
    return body;
  }
}
