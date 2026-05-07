// ============================================================
// app/(app)/dashboard/page.tsx — Dashboard Overview Page
//
// Server component that renders the main dashboard:
//   - Personalised greeting with the user's first name
//   - Three summary stat cards: Total Revenue, Pending, Overdue
//   - Table of the 5 most recent invoices with quick links
//
// All data is fetched in a single DB query and computed server-side
// so the page can be fully rendered on the server with no client JS.
//
// Route: /dashboard (protected by the (app) layout auth guard)
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import {
  DashboardNewButton,
  DashboardViewAllLink,
  DashboardCreateCTA,
  DashboardInvoiceRow,
} from "./DashboardActions";

export default async function DashboardPage() {
  const session = await auth();
  const userId  = session!.user!.id;

  const invoices = await db.invoice.findMany({
    where:   { userId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  type InvoiceRow = (typeof invoices)[number];

  const totalRevenue = invoices
    .filter((inv: InvoiceRow) => inv.status === "PAID")
    .reduce((sum: number, inv: InvoiceRow) => sum + inv.total, 0);

  const pendingAmount = invoices
    .filter((inv: InvoiceRow) => inv.status === "SENT")
    .reduce((sum: number, inv: InvoiceRow) => sum + inv.total, 0);

  const overdueCount = invoices.filter((inv: InvoiceRow) => inv.status === "OVERDUE").length;

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="p-4 sm:p-6 md:p-10">

      {/* ---- PAGE HEADER ---- */}
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-[#1a1a1a] truncate">
            Good morning, {session!.user!.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-[#6b6b6b] mt-1">
            Here&apos;s your invoice overview
          </p>
        </div>
        <DashboardNewButton />
      </div>

      {/* ---- STAT CARDS ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#e0ddd6] rounded-xl p-5">
          <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-[#1a1a1a]">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-[#aaa] mt-1">From paid invoices</p>
        </div>
        <div className="bg-white border border-[#e0ddd6] rounded-xl p-5">
          <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-1">Pending</p>
          <p className="text-2xl font-semibold text-blue-600">{formatCurrency(pendingAmount)}</p>
          <p className="text-xs text-[#aaa] mt-1">Awaiting payment</p>
        </div>
        <div className="bg-white border border-[#e0ddd6] rounded-xl p-5">
          <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-1">Overdue</p>
          <p className="text-2xl font-semibold text-red-500">{overdueCount}</p>
          <p className="text-xs text-[#aaa] mt-1">
            {overdueCount === 0 ? "All clear!" : "Needs attention"}
          </p>
        </div>
      </div>

      {/* ---- RECENT INVOICES ---- */}
      <div className="bg-white border border-[#e0ddd6] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0ddd6]">
          <h2 className="font-medium text-[#1a1a1a] text-sm">Recent Invoices</h2>
          <DashboardViewAllLink />
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-[#6b6b6b] text-sm mb-1">No invoices yet</p>
            <p className="text-[#aaa] text-xs mb-5">Create your first invoice to get started</p>
            <DashboardCreateCTA />
          </div>
        ) : (
          <div>
            {recentInvoices.map((invoice) => (
              <DashboardInvoiceRow key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
