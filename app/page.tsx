// ============================================================
// app/page.tsx — Root Route Handler
//
// The "/" path has no visible UI — it simply redirects based on
// whether the user has an active session:
//   Authenticated  → /dashboard
//   Not logged in  → /login
//
// This keeps the root URL useful without duplicating any page content.
// ============================================================

import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  // If logged in → go to dashboard
  // If not → go to login
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}