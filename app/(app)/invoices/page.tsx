// ============================================================
// app/(app)/invoices/page.tsx — Invoice List Page
//
// Server component that renders the invoice list with a status
// filter. The active filter is read from the `?status=` query
// parameter and applied directly in the Prisma query.
//
// Features:
//   - Filter tabs: All / Draft / Sent / Paid / Overdue
//   - Dual-layout rows: stacked on mobile, table-style on desktop
//   - Import button (→ /invoices/import) and New button (→ /invoices/new)
//   - Empty state with CTA to create the first invoice
//
// Route: /invoices (protected by the (app) layout auth guard)
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { InvoiceListActions } from "./InvoiceListActions";
import { InvoiceListHeader, InvoiceStatusTabs, InvoiceEmptyCTA } from "./InvoiceListControls";

const STATUSES = ["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id;
  const { status } = await searchParams;

  const activeFilter = STATUSES.includes(status as typeof STATUSES[number])
    ? (status as typeof STATUSES[number])
    : "ALL";

  const invoices = await db.invoice.findMany({
    where: {
      userId,
      ...(activeFilter !== "ALL" ? { status: activeFilter } : {}),
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-[#1a1a1a]">Invoices</h1>
          <p className="text-sm text-[#6b6b6b] mt-1">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </p>
        </div>
        <InvoiceListHeader />
      </div>

      {/* Status filter tabs */}
      <InvoiceStatusTabs activeFilter={activeFilter} />

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <div className="bg-white border border-[#e0ddd6] rounded-xl text-center py-20 px-6">
          <p className="text-[#6b6b6b] text-sm mb-1">No invoices found</p>
          <p className="text-[#aaa] text-xs mb-5">
            {activeFilter === "ALL"
              ? "Create your first invoice to get started"
              : `No ${activeFilter.toLowerCase()} invoices`}
          </p>
          {activeFilter === "ALL" && (
            <InvoiceEmptyCTA />
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#e0ddd6] rounded-xl overflow-hidden">

          {/* Desktop table header */}
          <div className="hidden sm:grid grid-cols-[1fr_1fr_110px_110px_90px_140px] gap-4 px-6 py-3
                          border-b border-[#e0ddd6] bg-[#f9f8f6]">
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Invoice</span>
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Client</span>
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Due</span>
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide text-right">Amount</span>
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Status</span>
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide text-right">Actions</span>
          </div>

          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="border-b border-[#e0ddd6] last:border-0 hover:bg-[#f9f8f6] transition-colors"
            >
              {/* Mobile layout */}
              <div className="sm:hidden flex items-start gap-3 px-4 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1a1a1a]">{inv.invoiceNo}</p>
                  <p className="text-xs text-[#6b6b6b] mt-0.5 truncate">{inv.client.name}</p>
                  <p className="text-xs text-[#aaa] mt-0.5">Due {formatDate(inv.dueDate)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-[#1a1a1a]">{formatCurrency(inv.total)}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(inv.status)}`}>
                    {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <div className="shrink-0 pt-0.5">
                  <InvoiceListActions invoiceId={inv.id} invoiceNo={inv.invoiceNo} />
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:grid grid-cols-[1fr_1fr_110px_110px_90px_140px] items-center
                              gap-4 px-6 py-4">
                <p className="text-sm font-medium text-[#1a1a1a]">{inv.invoiceNo}</p>
                <p className="text-sm text-[#6b6b6b] truncate">{inv.client.name}</p>
                <p className="text-sm text-[#6b6b6b] whitespace-nowrap">{formatDate(inv.dueDate)}</p>
                <p className="text-sm font-medium text-[#1a1a1a] text-right whitespace-nowrap">
                  {formatCurrency(inv.total)}
                </p>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${getStatusColor(inv.status)}`}>
                  {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                </span>
                <InvoiceListActions invoiceId={inv.id} invoiceNo={inv.invoiceNo} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
