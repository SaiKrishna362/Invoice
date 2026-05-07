// ============================================================
// middleware.ts — Auth guard for all protected routes
//
// Runs at the Edge on every request before any page renders.
// Unauthenticated requests to protected paths are redirected
// to /login — this covers both direct URL visits AND the RSC
// fetch requests Next.js makes during client-side navigation,
// which means the session check fires on every page transition,
// not just on the initial server render of the (app) layout.
// ============================================================

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on all paths except Next.js internals and static assets
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
