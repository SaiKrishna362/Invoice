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
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <ClientsManager initialClients={clients} />
    </div>
  );
}
