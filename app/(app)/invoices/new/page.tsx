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
