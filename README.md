# frontend-nextjs

Next.js (App Router + TypeScript + Tailwind) frontend for the authentication
module. It implements signup, login, OAuth sign-in (Google / Microsoft / Apple),
an OAuth callback handler, a protected dashboard, and token storage with
automatic refresh. It talks to the already-built Express backend via the API
contract below.

## Tech stack

- Next.js 14 (App Router) + React 18
- TypeScript
- Tailwind CSS
- ESLint (`next/core-web-vitals`)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure the backend URL
cp .env.local.example .env.local
# edit .env.local if your backend is not on http://localhost:4000

# 3. Run the dev server (port 3000)
npm run dev
# If port 3000 is busy:  PORT=3001 npm run dev

# Quality checks
npm run lint
npm run build
```

Open http://localhost:3000. Routes:

- `/` — redirects to `/dashboard` if a token exists, else `/login`
- `/login` — email + password + OAuth buttons
- `/signup` — name + email + password + OAuth buttons
- `/dashboard` — protected; shows the signed-in user + a Logout button
- `/auth/callback` — hit by the backend's OAuth redirect (not visited directly)

## Environment

`NEXT_PUBLIC_API_URL` — base URL of the Express auth backend. All auth
endpoints live under `/api/auth`. Defaults to `http://localhost:4000`. See
`.env.local.example`.

> **Important:** for OAuth to work, the **backend's `FRONTEND_URL` must equal
> this app's origin** (default `http://localhost:3000`). On success the backend
> redirects the browser to
> `${FRONTEND_URL}/auth/callback#accessToken=<jwt>&refreshToken=<jwt>`, and on
> failure to `${FRONTEND_URL}/login?error=<reason>`. If the two origins differ,
> the OAuth handoff will land on the wrong host.

## Running frontend + backend together (manual verification)

1. Start the backend (separate repo) on `http://localhost:4000` and set its
   `FRONTEND_URL=http://localhost:3000`.
2. In this repo: `cp .env.local.example .env.local` (keep the default URL),
   then `npm run dev`.
3. Visit http://localhost:3000/signup, create an account, and you should be
   redirected to `/dashboard`. Log out, then log back in at `/login`. For OAuth,
   click a provider button — the backend handles the provider handshake and
   redirects back to `/auth/callback`, which stores the tokens and lands you on
   `/dashboard`.

> `npm run build` and `npm run lint` do **not** require the backend. Live
> signup/login/OAuth/dashboard **do** require the backend running.

## Backend API contract (consumed as-is)

- `POST /api/auth/register` `{ email, password, name? }` → `201 { user, accessToken, refreshToken }`
- `POST /api/auth/login` `{ email, password }` → `200 { user, accessToken, refreshToken }`
- `POST /api/auth/refresh` `{ refreshToken }` → `200 { accessToken, refreshToken }` (rotates; old refresh token becomes invalid)
- `POST /api/auth/logout` `{ refreshToken }` → `204`
- `GET /api/auth/me` `Authorization: Bearer <accessToken>` → `200 { user }`
- OAuth (full-page navigation): `GET ${API}/api/auth/oauth/{google|microsoft|apple}`
- `user` shape: `{ id, email, name, provider, createdAt }`
- Errors: JSON `{ error: string }` with an appropriate 4xx status.

## Architecture

- **`lib/auth.ts`** — centralizes token storage and the `User` type.
- **`lib/api.ts`** — centralizes the base URL, attaches the Bearer token, and
  handles the refresh flow described below.
- **`components/OAuthButtons.tsx`** — provider buttons that do a full-page
  navigation to the backend OAuth endpoints.
- **`app/*`** — the routes listed above (all client components, since auth
  state is client-side).

### Token storage strategy (and tradeoff)

Tokens are stored in **`localStorage`** (centralized in `lib/auth.ts`). This is
simple, framework-idiomatic for a client-side auth flow, and survives reloads
and new tabs. The tradeoff: `localStorage` is readable by any JavaScript on the
page, so it is vulnerable to token theft via XSS — unlike an **HttpOnly**
cookie. For this module `localStorage` is an accepted choice; a production app
handling sensitive data should prefer HttpOnly, SameSite cookies set by the
backend. Because all storage access lives in one module, the strategy can be
swapped in one place.

### Automatic token refresh

`lib/api.ts` wraps every request. On a `401` for an authenticated request it
calls `POST /api/auth/refresh` **exactly once**, persists **both** rotated
tokens (the contract rotates the refresh token too), and retries the original
request. A single in-flight refresh promise is shared across concurrent 401s,
and a `_retried` guard prevents infinite refresh loops. If the refresh fails,
tokens are cleared and the app redirects to `/login`.
