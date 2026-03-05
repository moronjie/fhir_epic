"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if we're returning from OAuth
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (code && state) {
      router.push(`/api/v1/epic/redirect?code=${code}&state=${state}`);
    } else if (error) {
      router.push(`/api/v1/epic/redirect?error=${error}&error_description=${errorDescription}`);
    }
  }, [router]);

  return (
    <div className="gradient-hero relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
            animation: "pulse-dot 4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            animation: "pulse-dot 5s ease-in-out infinite 1s",
          }}
        />
        <div
          className="absolute top-1/3 left-1/4 h-60 w-60 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
            animation: "pulse-dot 6s ease-in-out infinite 2s",
          }}
        />
      </div>

      <main className="relative z-10 flex w-full max-w-lg flex-col items-center px-6">
        {/* Logo / Icon */}
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>

        {/* Glass card */}
        <div className="glass-card w-full p-10 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
            Epic FHIR
          </h1>
          <p className="mb-1 text-lg font-medium text-indigo-200">
            Provider Portal
          </p>
          <p className="mb-8 text-sm text-indigo-300/80">
            Secure provider-context access to patient data via FHIR R4
          </p>

          {/* Divider */}
          <div className="mx-auto mb-8 h-px w-16 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

          {/* Feature pills */}
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {["Patient Records", "FHIR R4", "OAuth 2.0", "SMART on FHIR"].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur-sm"
                >
                  {tag}
                </span>
              ),
            )}
          </div>

          {/* Connect button */}
          <Link
            href="/api/v1/epic/authorize"
            id="connect-epic-btn"
            className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-white px-6 py-4 text-base font-semibold text-indigo-900 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-indigo-400/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="relative">Connect with Epic</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative transition-transform duration-300 group-hover:translate-x-1"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>

          <p className="mt-4 text-xs text-indigo-400/60">
            You will be redirected to Epic&apos;s secure login
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-indigo-300/40">
          Proof of Concept &middot; Provider Context Demo
        </p>
      </main>
    </div>
  );
}
