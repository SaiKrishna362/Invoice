// ============================================================
// auth.ts — Authentication Configuration (NextAuth / Auth.js v5)
//
// Sets up credential-based login (email + password).
// Exports four helpers used throughout the app:
//   - handlers  → mounted at /api/auth/[...nextauth]/route.ts
//   - auth()    → call in Server Components/Actions to get the session
//   - signIn()  → programmatic login
//   - signOut() → programmatic logout
// ============================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Credential provider: user supplies email + password
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      // authorize() is called by NextAuth on every login attempt.
      // Returns the user object on success, or null to reject the login.
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        // Normalise email so "User@Example.com" and "user@example.com" match
        const email = (credentials.email as string).toLowerCase().trim();
        const user  = await db.user.findUnique({ where: { email } });

        // No account found → reject (same error message as wrong password to prevent enumeration)
        if (!user) return null;

        // Compare submitted password against the stored bcrypt hash
        const match = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!match) return null;

        // Return only the fields we want in the JWT / session
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],

  callbacks: {
    // jwt() — runs when the JWT is created or refreshed.
    // We embed the DB user ID in the token so it's always available server-side.
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },

    // session() — runs when session() is called.
    // We forward the ID from the token into session.user so pages can read it.
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },

  // Redirect unauthenticated users to /login instead of the NextAuth default page
  pages:   { signIn: "/login" },

  // JWT strategy: no server-side session storage needed — token lives in a cookie
  session: { strategy: "jwt" },

  secret:  process.env.NEXTAUTH_SECRET,
});
