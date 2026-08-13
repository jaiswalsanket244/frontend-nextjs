"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout } from "@/lib/api";
import { hasToken, type User } from "@/lib/auth";

type Status = "loading" | "ready";

/**
 * Protected dashboard. On load it ensures a valid session by calling /me.
 * The API client transparently refreshes on a 401; if the refresh also fails
 * it clears tokens and redirects to /login. We additionally guard against the
 * no-token case up front.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    // No token at all → straight to login.
    if (!hasToken()) {
      router.replace("/login");
      return;
    }

    getMe()
      .then((res) => {
        if (!active) return;
        setUser(res.user);
        setStatus("ready");
      })
      .catch(() => {
        // apiFetch already redirects to /login on a failed refresh; this
        // catch handles any other error path defensively.
        if (!active) return;
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function onLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }

  if (status === "loading" || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading your dashboard…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          You are signed in. Here are your account details.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <dl className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-6 py-4">
              <dt className="text-sm font-medium text-slate-500">Name</dt>
              <dd className="text-sm text-slate-900">
                {user.name || "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <dt className="text-sm font-medium text-slate-500">Email</dt>
              <dd className="text-sm text-slate-900">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <dt className="text-sm font-medium text-slate-500">Provider</dt>
              <dd className="text-sm capitalize text-slate-900">
                {user.provider}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
