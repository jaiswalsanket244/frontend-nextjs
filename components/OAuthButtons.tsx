"use client";

import { oauthUrl } from "@/lib/api";

type Provider = "google" | "microsoft" | "apple";

const PROVIDERS: {
  id: Provider;
  label: string;
  className: string;
}[] = [
  {
    id: "google",
    label: "Continue with Google",
    className: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  },
  {
    id: "microsoft",
    label: "Continue with Microsoft",
    className: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  },
  {
    id: "apple",
    label: "Continue with Apple",
    className: "border-black bg-black text-white hover:bg-slate-800",
  },
];

/**
 * OAuth provider buttons. These do a FULL-PAGE navigation (not fetch) to the
 * backend's OAuth initiation endpoint, which redirects to /auth/callback with
 * tokens in the URL fragment on success.
 */
export default function OAuthButtons() {
  const startOAuth = (provider: Provider) => {
    window.location.href = oauthUrl(provider);
  };

  return (
    <div className="flex flex-col gap-3">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => startOAuth(p.id)}
          className={`flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${p.className}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
