// ============================================================
// app/(app)/dashboard/DashboardActions.tsx — Dashboard Client Islands
//
// Extracts all interactive navigation links from DashboardPage
// (a server component) into client components so they can use
// NavLink and show a spinner while the target page loads.
//
// Components exported:
//   DashboardNewButton      — "+ New Invoice" header CTA
//   DashboardViewAllLink    — "View all →" link in recent invoices header
//   DashboardCreateCTA      — "Create Invoice" empty-state button
//   DashboardInvoiceRow     — One row in the recent-invoices list with View link
// ============================================================

"use client";

import { NavLink } from "@/components/NavLink";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

/** "+ New Invoice" button in the dashboard header. */
export function DashboardNewButton() {
  return (
    <NavLink
      href="/invoices/new"
      className="bg-[#1a6b4a] text-white text-sm font-medium px-5 py-2.5 rounded-lg
                 hover:bg-[#2d9b6f] transition-colors"
      spinnerClassName="w-4 h-4"
    >
      + New Invoice
    </NavLink>
  );
}

/** "View all →" link in the recent invoices card header. */
export function DashboardViewAllLink() {
  return (
    <NavLink
      href="/invoices"
      className="text-xs text-[#2d9b6f] hover:underline"
    >
      View all →
    </NavLink>
  );
}

/** "Create Invoice" CTA shown when there are no invoices yet. */
export function DashboardCreateCTA() {
  return (
    <NavLink
      href="/invoices/new"
      className="inline-flex bg-[#1a6b4a] text-white text-sm px-4 py-2 rounded-lg
                 hover:bg-[#2d9b6f] transition-colors"
      spinnerClassName="w-4 h-4"
    >
      Create Invoice
    </NavLink>
  );
}

interface InvoiceRow {
  id: string;
  invoiceNo: string;
  total: number;
  dueDate: Date;
  status: string;
  client: { name: string };
}

/**
 * One row in the recent-invoices list.
 * Renders all the static data plus a NavLink "View →" that shows a spinner.
 */
export function DashboardInvoiceRow({ invoice }: { invoice: InvoiceRow }) {
  return (
    <div
      className="flex items-center gap-4 px-6 py-4 border-b border-[#e0ddd6] last:border-0
                 hover:bg-[#f9f8f6] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1a1a1a]">{invoice.invoiceNo}</p>
        <p className="text-xs text-[#6b6b6b] truncate">{invoice.client.name}</p>
      </div>
      <p className="text-xs text-[#6b6b6b] hidden sm:block">
        Due {formatDate(invoice.dueDate)}
      </p>
      <p className="text-sm font-medium text-[#1a1a1a]">
        {formatCurrency(invoice.total)}
      </p>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(invoice.status)}`}>
        {invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
      </span>
      <NavLink
        href={`/invoices/${invoice.id}`}
        className="text-xs text-[#2d9b6f] hover:underline shrink-0"
      >
        View →
      </NavLink>
    </div>
  );
}
