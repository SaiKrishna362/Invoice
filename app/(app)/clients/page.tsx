// ============================================================
// app/(app)/clients/page.tsx — Clients List Page
//
// Server component that fetches the user's clients and passes
// them to the ClientsManager client component.
//
// Route: /clients (protected by the (app) layout auth guard)
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ClientsManager } from "./ClientsManager";

export default async function ClientsPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const clients = await db.client.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-4xl mx-auto">
      <ClientsManager initialClients={clients} />
    </div>
  );
}
