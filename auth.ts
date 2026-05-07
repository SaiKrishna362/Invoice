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
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const user  = await db.user.findUnique({ where: { email } });

        if (!user) return null;

        const match = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!match) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },

  pages:   { signIn: "/login" },
  session: { strategy: "jwt" },
  secret:  process.env.NEXTAUTH_SECRET,
});
