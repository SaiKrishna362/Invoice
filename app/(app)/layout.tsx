// ============================================================
// app/(app)/layout.tsx — Authenticated App Layout
//
// Wraps all routes inside the (app) route group:
//   /dashboard, /invoices/*, /clients, /profile
//
// Responsibilities:
//   1. Auth gate — redirects to /login if there is no session
//   2. Renders the Navbar (passes the user's name for the profile link)
//   3. Wraps page content in a full-height container
//
// The (app) route group name is just a Next.js convention — it does
// not appear in the URL. Routes inside this folder are public paths
// only after this auth check passes.
// ============================================================

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      <Navbar userName={session.user.name} />
      <div className="pb-16 md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
