"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasToken } from "@/lib/auth";

/**
 * Home route: redirect to /dashboard if a token exists, otherwise to /login.
 * Rendered client-side because token state lives in localStorage.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (hasToken()) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-500">Loading…</p>
    </main>
  );
}
