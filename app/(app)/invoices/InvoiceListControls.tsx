// ============================================================
// app/(app)/invoices/InvoiceListControls.tsx — Invoice List Client Islands
//
// Client components extracted from InvoicesPage (a server component)
// so that navigation buttons and filter tabs can use NavLink and
// show a spinner while the target page is loading.
//
// Exported:
//   InvoiceListHeader   — "Import" + "+ New" header buttons
//   InvoiceStatusTabs   — All / Draft / Sent / Paid / Overdue filter tabs
//   InvoiceEmptyCTA     — "Create Invoice" button shown on empty list
// ============================================================

"use client";

import { NavLink } from "@/components/NavLink";

const STATUSES = ["ALL", "DRAFT", "SENT", "PAID", "OVERDUE"] as const;
type StatusFilter = typeof STATUSES[number];

/** "Import" and "+ New" action buttons in the invoice list header. */
export function InvoiceListHeader() {
  return (
    <div className="flex gap-2 shrink-0">
      <NavLink
        href="/invoices/import"
        className="border border-[#e0ddd6] text-[#6b6b6b] text-sm font-medium px-3 sm:px-4 py-2.5 rounded-lg
                   hover:bg-[#f5f4f0] transition-colors"
      >
        {/* Upload icon on mobile, text on sm+ */}
        <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <span className="hidden sm:inline">Import</span>
      </NavLink>
      <NavLink
        href="/invoices/new"
        className="bg-[#1a6b4a] text-white text-sm font-medium px-4 py-2.5 rounded-lg
                   hover:bg-[#2d9b6f] transition-colors whitespace-nowrap"
        spinnerClassName="w-4 h-4"
      >
        + New
      </NavLink>
    </div>
  );
}

/**
 * Status filter tab bar (All / Draft / Sent / Paid / Overdue).
 * Highlights the active tab and shows a spinner on the tab being navigated to.
 *
 * @param activeFilter  Currently selected filter, used to style the active tab
 */
export function InvoiceStatusTabs({ activeFilter }: { activeFilter: StatusFilter }) {
  return (
    <div className="overflow-x-auto mb-5 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1 bg-white border border-[#e0ddd6] rounded-xl p-1 w-max">
        {STATUSES.map((s) => (
          <NavLink
            key={s}
            href={s === "ALL" ? "/invoices" : `/invoices?status=${s}`}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap
              ${activeFilter === s
                ? "bg-[#1a6b4a] text-white"
                : "text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f5f4f0]"
              }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

/** "Create Invoice" CTA shown on the empty state of the invoice list. */
export function InvoiceEmptyCTA() {
  return (
    <NavLink
      href="/invoices/new"
      className="inline-flex bg-[#1a6b4a] text-white text-sm px-5 py-2.5 rounded-lg
                 hover:bg-[#2d9b6f] transition-colors"
      spinnerClassName="w-4 h-4"
    >
      Create Invoice
    </NavLink>
  );
}
