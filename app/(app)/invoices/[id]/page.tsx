// ============================================================
// app/(app)/invoices/[id]/page.tsx — Invoice Detail Page
//
// Server component that renders the full invoice view for a single invoice.
// Layout has two columns:
//   Left  — invoice header, From/To blocks, line items table, totals, notes
//   Right — sticky action sidebar (InvoiceActions client component)
//
// Security:
//   - notFound() for missing invoices (avoids leaking IDs)
//   - redirect("/invoices") if the invoice belongs to a different user
//
// Route: /invoices/:id (protected by the (app) layout auth guard)
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { InvoiceActions } from "./InvoiceActions";
import { NavLink } from "@/components/NavLink";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId  = session!.user!.id;
  const { id }  = await params;

  const invoice = await db.invoice.findUnique({
    where:   { id },
    include: { client: true, items: true, user: true },
  });

  if (!invoice)                  notFound();
  if (invoice.userId !== userId) redirect("/invoices");

  const statusLabel = invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase();

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-6">
        <NavLink href="/invoices" className="hover:text-[#1a1a1a] transition-colors">Invoices</NavLink>
        <span>/</span>
        <span className="text-[#1a1a1a] font-medium">{invoice.invoiceNo}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">

        {/* Action sidebar — rendered first in DOM so it appears at top on mobile */}
        <div className="lg:w-60 shrink-0 order-first lg:order-last">
          <div className="bg-white border border-[#e0ddd6] rounded-2xl p-5 lg:sticky lg:top-6">
            <p className="text-sm font-semibold text-[#1a1a1a] mb-4">Actions</p>
            <InvoiceActions
              invoiceId={invoice.id}
              status={invoice.status}
              clientEmail={invoice.client.email}
            />
          </div>
        </div>

        {/* Main invoice view */}
        <div className="flex-1 space-y-4 min-w-0 order-last lg:order-first">

          {/* Header card */}
          <div className="bg-white border border-[#e0ddd6] rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a]">{invoice.invoiceNo}</h1>
                <p className="text-sm text-[#6b6b6b] mt-0.5">
                  Created {formatDate(invoice.createdAt)} · Due {formatDate(invoice.dueDate)}
                </p>
              </div>
              <span className={`text-sm px-3 py-1.5 rounded-full font-medium shrink-0 ${getStatusColor(invoice.status)}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#e0ddd6] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#2d9b6f] uppercase tracking-wide mb-3">From</p>
              <p className="text-sm font-semibold text-[#1a1a1a]">{invoice.user.name}</p>
              <p className="text-sm text-[#6b6b6b] break-all">{invoice.user.email}</p>
              {invoice.user.phone   && <p className="text-sm text-[#6b6b6b]">{invoice.user.phone}</p>}
              {invoice.user.address && <p className="text-sm text-[#6b6b6b] whitespace-pre-line">{invoice.user.address}</p>}
              {invoice.user.gstin   && <p className="text-xs text-[#aaa] mt-1 font-medium">GSTIN: {invoice.user.gstin}</p>}
            </div>
            <div className="bg-white border border-[#e0ddd6] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#2d9b6f] uppercase tracking-wide mb-3">To</p>
              <p className="text-sm font-semibold text-[#1a1a1a]">{invoice.client.name}</p>
              <p className="text-sm text-[#6b6b6b] break-all">{invoice.client.email}</p>
              {invoice.client.phone   && <p className="text-sm text-[#6b6b6b]">{invoice.client.phone}</p>}
              {invoice.client.address && <p className="text-sm text-[#6b6b6b] whitespace-pre-line">{invoice.client.address}</p>}
              {invoice.client.gstin   && <p className="text-xs text-[#aaa] mt-1 font-medium">GSTIN: {invoice.client.gstin}</p>}
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white border border-[#e0ddd6] rounded-2xl overflow-hidden">
            {/* Desktop header */}
            <div className="hidden sm:grid grid-cols-[1fr_70px_120px_120px] gap-4 px-6 py-3
                            bg-[#f9f8f6] border-b border-[#e0ddd6]">
              <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Description</span>
              <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Qty</span>
              <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide text-right">Rate</span>
              <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide text-right">Amount</span>
            </div>

            {invoice.items.map((item) => (
              <div
                key={item.id}
                className="px-5 sm:px-6 py-4 border-b border-[#e0ddd6] last:border-0
                           sm:grid sm:grid-cols-[1fr_70px_120px_120px] sm:gap-4 sm:items-center"
              >
                <div>
                  <p className="text-sm text-[#1a1a1a]">{item.description}</p>
                  {/* Mobile: show qty × rate below description */}
                  <p className="text-xs text-[#aaa] mt-0.5 sm:hidden">
                    {item.quantity} × {formatCurrency(item.rate)}
                  </p>
                </div>
                <p className="hidden sm:block text-sm text-[#6b6b6b]">{item.quantity}</p>
                <p className="hidden sm:block text-sm text-[#6b6b6b] text-right">
                  {formatCurrency(item.rate)}
                </p>
                <p className="text-sm font-semibold text-[#1a1a1a] text-right mt-1 sm:mt-0">
                  {formatCurrency(item.amount)}
                </p>
              </div>
            ))}

            {/* Totals */}
            <div className="px-5 sm:px-6 py-4 bg-[#f9f8f6] space-y-2">
              <div className="flex justify-end gap-12 sm:gap-16 text-sm text-[#6b6b6b]">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-end gap-12 sm:gap-16 text-sm text-[#6b6b6b]">
                <span>GST @ {invoice.gstPercent}%</span>
                <span>{formatCurrency(invoice.gstAmount)}</span>
              </div>
              <div className="flex justify-end gap-12 sm:gap-16 text-base font-semibold text-[#1a6b4a] pt-2 border-t border-[#e0ddd6]">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white border border-[#e0ddd6] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#2d9b6f] uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-[#6b6b6b] whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
