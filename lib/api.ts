/**
 * Centralized API client for the Express auth backend.
 *
 * Responsibilities:
 *  - Resolve the base URL from NEXT_PUBLIC_API_URL (default http://localhost:4000).
 *  - Attach the Bearer access token to authenticated requests.
 *  - On a 401, attempt POST /api/auth/refresh exactly once, persist the rotated
 *    tokens, and retry the original request. If refresh fails, clear tokens and
 *    redirect to /login. A single in-flight refresh is shared to avoid loops.
 */

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  type User,
} from "./auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

const AUTH_PREFIX = "/api/auth";

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string") return data.error;
  } catch {
    // fall through to generic message
  }
  return `Request failed with status ${res.status}`;
}

// Shared in-flight refresh promise so concurrent 401s trigger a single refresh.
let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}${AUTH_PREFIX}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    if (!data.accessToken || !data.refreshToken) return false;
    // Persist BOTH rotated tokens (old refresh token is now invalid).
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function redirectToLogin(reason?: string): void {
  if (typeof window === "undefined") return;
  const suffix = reason ? `?error=${encodeURIComponent(reason)}` : "";
  window.location.href = `/login${suffix}`;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Attach the Bearer access token (default true). */
  auth?: boolean;
  /** Internal: prevents a second refresh attempt (loop guard). */
  _retried?: boolean;
}

/**
 * Core request helper. Sends JSON, attaches auth, and transparently refreshes
 * once on a 401 for authenticated requests.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, _retried = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401 for authenticated requests, exactly once.
  if (res.status === 401 && auth && !_retried) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    // Refresh failed: clear tokens and bounce to login.
    clearTokens();
    redirectToLogin("session_expired");
    throw new ApiError("Session expired", 401);
  }

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }

  // 204 No Content (e.g. logout) has no body.
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

/* ----------------------------- Auth API calls ----------------------------- */

export function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(`${AUTH_PREFIX}/register`, {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(`${AUTH_PREFIX}/login`, {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function getMe(): Promise<{ user: User }> {
  return apiFetch<{ user: User }>(`${AUTH_PREFIX}/me`);
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await apiFetch<void>(`${AUTH_PREFIX}/logout`, {
        method: "POST",
        body: { refreshToken },
        auth: false,
      });
    } catch {
      // Best-effort: even if the server call fails, we clear local tokens.
    }
  }
  clearTokens();
}

/** Full-page navigation URL to begin an OAuth flow. */
export function oauthUrl(provider: "google" | "microsoft" | "apple"): string {
  return `${API_BASE_URL}${AUTH_PREFIX}/oauth/${provider}`;
}
