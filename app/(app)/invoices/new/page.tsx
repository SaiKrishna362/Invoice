// ============================================================
// app/(app)/invoices/new/page.tsx — New Invoice Page
//
// Server component that fetches the user's clients (name + email only)
// and passes them to the NewInvoiceForm client component.
//
// Only id, name, and email are fetched — just enough to populate
// the client dropdown without over-fetching.
//
// Route: /invoices/new (protected by the (app) layout auth guard)
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NewInvoiceForm } from "./NewInvoiceForm";

export default async function NewInvoicePage() {
  const session = await auth();
  const userId = session!.user!.id;

  const clients = await db.client.findMany({
    where:   { userId },
    orderBy: { name: "asc" },
    select:  { id: true, name: true, email: true },
  });

  return <NewInvoiceForm clients={clients} />;
}
