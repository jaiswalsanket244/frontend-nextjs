"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setTokens } from "@/lib/auth";

/**
 * OAuth callback handler. The backend redirects the browser here with tokens
 * in the URL FRAGMENT (hash), e.g.
 *   /auth/callback#accessToken=<jwt>&refreshToken=<jwt>
 *
 * The fragment is only readable client-side (window.location.hash), which is
 * why this MUST be a client component. We parse the tokens, store them, and
 * redirect to /dashboard. If tokens are missing, bounce to /login with an error.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      // Clear the sensitive fragment from the URL before navigating away.
      window.location.hash = "";
      router.replace("/dashboard");
    } else {
      router.replace("/login?error=oauth_failed");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-500">Completing sign-in…</p>
    </main>
  );
}
