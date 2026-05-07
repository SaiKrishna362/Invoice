// ============================================================
// next.config.ts — Next.js Production Configuration
//
// Security headers applied to every response:
//   X-Frame-Options          — prevents clickjacking (no iframes)
//   X-Content-Type-Options   — prevents MIME-sniffing attacks
//   Referrer-Policy          — limits referrer leakage to same origin
//   Permissions-Policy       — disables camera / mic / geolocation
//   Strict-Transport-Security — forces HTTPS on all future requests (HSTS)
//     max-age=63072000 = 2 years (recommended production value)
//     includeSubDomains — covers all subdomains
//     preload — eligible for browser HSTS preload lists
//
// Note: Remove HSTS during local dev if you run on plain http://localhost —
// the header is harmless there (browsers only honour it on HTTPS origins)
// but some local tooling may log a warning.
// ============================================================

import type { NextConfig } from "next";

const securityHeaders = [
  // Block the app from being embedded in iframes on other sites
  { key: "X-Frame-Options",        value: "DENY" },
  // Prevent browsers from MIME-sniffing a response away from its declared type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send full referrer to same-origin requests; strip it for cross-origin
  { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
  // Disable browser features this app never uses
  { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Force HTTPS for 2 years (production only — see note above)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
