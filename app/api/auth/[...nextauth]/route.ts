// ============================================================
// app/api/auth/[...nextauth]/route.ts — Auth.js Catch-all Route
//
// This file exposes the Auth.js HTTP handlers as Next.js route
// handlers, covering all /api/auth/* paths:
//   GET  /api/auth/session      → returns the current session JSON
//   GET  /api/auth/providers    → lists available login providers
//   GET  /api/auth/csrf         → returns the CSRF token
//   POST /api/auth/callback/... → processes login callbacks
//   POST /api/auth/signout      → ends the session
//
// All sign-in logic and JWT callbacks live in auth.ts.
// Do not add route-specific logic here — use auth.ts callbacks instead.
// ============================================================

import { handlers } from "@/auth";
export const { GET, POST } = handlers;
