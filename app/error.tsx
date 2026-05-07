// ============================================================
// app/error.tsx — Route-Level Error Boundary
//
// Catches unexpected runtime errors thrown by any server component
// or server action inside the (app) route group and renders a
// branded error page instead of the plain Next.js 500 screen.
//
// Must be a Client Component so Next.js can pass `reset` as a prop.
// `reset` re-attempts to render the failed route segment, which
// often recovers from transient errors (network blips, DB timeouts).
// ============================================================

"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Runtime error boundary for all authenticated routes.
 *
 * @param error  The thrown error — logged to the console for debugging
 * @param reset  Function that re-renders the failed segment (try-again)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error so it appears in your hosting provider's log stream
    console.error("[app/error.tsx]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
      <div className="w-full max-w-md text-center">

        {/* Branded header */}
        <p className="text-3xl font-semibold tracking-tight text-[#1a1a1a] mb-1">
          tulluri<span className="text-[#2d9b6f]">.</span>
        </p>

        {/* Error icon */}
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto my-6">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-2">Something went wrong</h1>
        <p className="text-sm text-[#6b6b6b] mb-8">
          An unexpected error occurred. You can try again or return to the dashboard.
          {/* Show the digest in dev for easier debugging; hide in prod */}
          {error.digest && (
            <span className="block mt-2 text-xs text-[#aaa] font-mono">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-[#1a6b4a] text-white text-sm font-medium rounded-lg
                       hover:bg-[#2d9b6f] transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 border border-[#e0ddd6] text-sm text-[#6b6b6b] rounded-lg
                       hover:bg-[#f5f4f0] transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
