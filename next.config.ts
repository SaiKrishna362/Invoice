// ============================================================
// next.config.ts — Next.js Production Configuration
//
// Security headers applied to every response:
//   Content-Security-Policy  — whitelist of allowed content sources
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

// Content-Security-Policy directives:
//   default-src 'self'       — fall-through: only load from the same origin
//   script-src               — Next.js needs 'unsafe-inline' + 'unsafe-eval' in dev;
//                              in production it inlines a small chunk manifest
//   style-src                — Tailwind generates inline styles; Google Fonts CDN
//   font-src                 — Google Fonts static files
//   img-src                  — allow data URIs (base64 avatars) and same-origin
//   connect-src              — XHR/fetch: same origin + Next.js HMR in dev
//   frame-src / object-src   — fully blocked
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self';
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  // Content Security Policy — defence against XSS and data injection
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
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
