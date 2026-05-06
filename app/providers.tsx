// ============================================
// app/providers.tsx — Session Provider Wrapper
//
// NextAuth requires a client-side context provider
// so all pages can access the logged-in user's session.
// We wrap the whole app with this in layout.tsx.
// ============================================

"use client"; // Must be a Client Component (runs in browser)

import { SessionProvider as NextAuthProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    // This gives every child component access to useSession()
    <NextAuthProvider>{children}</NextAuthProvider>
  );
}
