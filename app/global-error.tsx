// ============================================================
// app/global-error.tsx — Root Layout Error Boundary
//
// Catches errors thrown by the root layout itself (app/layout.tsx).
// Because the root layout is broken in this scenario, this component
// MUST include its own <html> and <body> tags — Next.js renders it
// as a complete standalone page, bypassing the broken layout entirely.
//
// This is the last line of defence: if something in SessionProvider
// or the DM Sans font load crashes, this page is what users see.
//
// Like app/error.tsx, must be a Client Component.
// ============================================================

"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary — only fires when app/layout.tsx itself crashes.
 * For errors inside authenticated routes, app/error.tsx handles them first.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error.tsx]", error);
  }, [error]);

  return (
    // Must supply html + body because the root layout is unavailable
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#f5f4f0", fontFamily: "Arial, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>

            <p style={{ fontSize: 28, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>
              tulluri<span style={{ color: "#2d9b6f" }}>.</span>
            </p>

            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", margin: "24px 0 8px" }}>
              Critical error
            </h1>
            <p style={{ fontSize: 14, color: "#6b6b6b", marginBottom: 24 }}>
              The application failed to load. Please try again.
              {error.digest && (
                <span style={{ display: "block", marginTop: 8, fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>
                  Error ID: {error.digest}
                </span>
              )}
            </p>

            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                background: "#1a6b4a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>

          </div>
        </div>
      </body>
    </html>
  );
}
