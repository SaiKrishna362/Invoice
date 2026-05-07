// ============================================================
// app/(app)/profile/page.tsx — Profile Page
//
// Server component that loads the full user record and passes it
// to the ProfileForm client component. Uses redirect() rather
// than relying solely on the (app) layout auth guard so we can
// also handle the edge case where the user record was deleted
// while the session is still alive.
//
// Route: /profile (protected by the (app) layout auth guard)
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  return <ProfileForm user={user} />;
}
