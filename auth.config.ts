// ============================================================
// auth.config.ts — Edge-compatible Auth.js base config
//
// Intentionally has NO database or Prisma imports so it can
// run safely in the Edge runtime (middleware).
//
// The full auth.ts merges this with the Credentials provider
// and DB-dependent callbacks.
// ============================================================

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    // Runs in middleware to decide whether a request is allowed through.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isProtected =
        path.startsWith("/dashboard") ||
        path.startsWith("/invoices")  ||
        path.startsWith("/clients")   ||
        path.startsWith("/profile");

      if (isProtected && !isLoggedIn) return false; // redirect to /login
      return true;
    },

    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },

    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },

  providers: [], // filled in by auth.ts
} satisfies NextAuthConfig;
