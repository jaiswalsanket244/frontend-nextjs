/**
 * Token storage + session helpers.
 *
 * STORAGE STRATEGY (documented tradeoff):
 * We persist the access & refresh tokens in `localStorage`. This keeps the
 * module framework-idiomatic for a client-side auth flow and survives page
 * reloads / new tabs. The tradeoff is that localStorage is readable by any
 * JavaScript running on the page, so it is vulnerable to XSS token theft —
 * unlike an HttpOnly cookie. For this module localStorage is an accepted
 * choice; a production app handling sensitive data should prefer HttpOnly,
 * SameSite cookies set by the backend. All access to storage is centralized
 * here so the strategy can be swapped in one place.
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  provider: string;
  createdAt: string;
}

const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";

const isBrowser = (): boolean => typeof window !== "undefined";

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasToken(): boolean {
  return getAccessToken() !== null;
}
