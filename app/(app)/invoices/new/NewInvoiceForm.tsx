// ============================================================
// app/(app)/invoices/new/NewInvoiceForm.tsx — New Invoice Form
//
// Client component for creating a new invoice. The form is split
// into four cards: Invoice Details, Line Items, Tax & Total, Notes.
//
// Line items are managed in local React state (not hidden inputs)
// so the totals update live as the user types. On submit, the items
// are serialised into parallel FormData arrays (itemDescription[],
// itemQuantity[], itemRate[]) that createInvoiceAction reads.
//
// On success (state.invoiceId is set), the router navigates to the
// new invoice's detail page.
//
// Route: /invoices/new (protected by the (app) layout auth guard)
// ============================================================

"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/app/actions/invoice";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { useNavigation } from "@/components/NavigationProgress";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  rate: string;
}

const newItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: "1",
  rate: "",
});

const INPUT = "w-full px-3 py-2 text-sm border border-[#e0ddd6] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]";

/**
 * Full-page form for creating a new invoice.
 *
 * @param clients  The user's client list (fetched server-side in page.tsx).
 *                 Shown in the client dropdown; if empty, the submit button
 *                 is disabled and a prompt to add a client is shown instead.
 */
export function NewInvoiceForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createInvoiceAction, null);
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [gstPercent, setGstPercent] = useState(18);
  const [isDirty, setIsDirty] = useState(false);
  const { setNavigating } = useNavigation();
  useEffect(() => { if (!pending) setNavigating(false); }, [pending]);

  const { showPrompt, proceedNavigation, cancelNavigation, clearDirty } =
    useUnsavedChanges(isDirty);

  useEffect(() => {
    if (state?.invoiceId) {
      // Clear dirty flag before navigating so the guard doesn't fire.
      clearDirty();
      router.push(`/invoices/${state.invoiceId}`);
    }
  }, [state, router]);

  function updateItem(id: string, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const subtotal = items.reduce((sum, it) => {
    return sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0);
  }, 0);
  const gstAmount = subtotal * (gstPercent / 100);
  const total = subtotal + gstAmount;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
    {showPrompt && (
      <UnsavedChangesModal
        onProceed={proceedNavigation}
        onCancel={cancelNavigation}
      />
    )}
    <div className="p-4 sm:p-6 md:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">New Invoice</h1>
        <p className="text-sm text-[#6b6b6b] mt-1">Fill in the details to create an invoice.</p>
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
          {state.error}
        </div>
      )}

      {clients.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3 mb-5">
          You need to{" "}
          <a href="/clients" className="underline font-medium">add a client</a>{" "}
          before creating an invoice.
        </div>
      )}

      {/* onInput bubbles from every input/select/textarea inside the form */}
      <form action={formAction} onSubmit={() => setNavigating(true)} className="space-y-5" onInput={() => setIsDirty(true)}>

        {/* Client + Due date */}
        <div className="bg-white border border-[#e0ddd6] rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[#1a1a1a] mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Client *</label>
              <select
                name="clientId"
                required
                className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg bg-white
                           focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
              >
                <option value="">Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Due Date *</label>
              <input
                name="dueDate"
                type="date"
                min={today}
                required
                className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white border border-[#e0ddd6] rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[#1a1a1a] mb-4">Line Items</h2>

          {/* Desktop column headers */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_110px_90px] gap-3 mb-2">
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Description</span>
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Qty</span>
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Rate (₹)</span>
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide text-right">Amount</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
              return (
                /* Mobile: stacked card; Desktop: 4-col grid via sm:contents */
                <div
                  key={item.id}
                  className="border border-[#e0ddd6] rounded-xl p-3 space-y-2
                             sm:border-0 sm:rounded-none sm:p-0 sm:space-y-0
                             sm:grid sm:grid-cols-[1fr_80px_110px_90px] sm:gap-3 sm:items-center"
                >
                  <input
                    name="itemDescription"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    placeholder="e.g. Logo Design"
                    required
                    className={INPUT}
                  />
                  {/* On mobile: qty + rate + amount in a row; on desktop: sm:contents spreads them */}
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center sm:contents">
                    <input
                      name="itemQuantity"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="Qty"
                      className={INPUT}
                    />
                    <input
                      name="itemRate"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Rate"
                      required
                      className={INPUT}
                    />
                    <div className="flex items-center justify-end gap-1.5 sm:justify-end">
                      <span className="text-sm font-medium text-[#1a1a1a] whitespace-nowrap">
                        {amount > 0 ? fmt(amount) : "—"}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[#bbb] hover:text-red-500 text-xl leading-none transition-colors shrink-0"
                          aria-label="Remove item"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setItems((p) => [...p, newItem()])}
            className="mt-4 text-sm text-[#2d9b6f] hover:text-[#1a6b4a] font-medium transition-colors"
          >
            + Add line item
          </button>
        </div>

        {/* GST + Totals */}
        <div className="bg-white border border-[#e0ddd6] rounded-2xl p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[#1a1a1a] mb-4">Tax &amp; Total</h2>

          <div className="flex items-center gap-4 mb-5">
            <label className="text-sm font-medium text-[#1a1a1a]">GST %</label>
            <select
              name="gstPercent"
              value={gstPercent}
              onChange={(e) => setGstPercent(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-[#e0ddd6] rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
            >
              <option value={0}>0% (Exempt)</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
              <option value={28}>28%</option>
            </select>
          </div>

          <div className="space-y-2 text-sm border-t border-[#e0ddd6] pt-4">
            <div className="flex justify-between text-[#6b6b6b]">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#6b6b6b]">
              <span>GST @ {gstPercent}%</span><span>{fmt(gstAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base text-[#1a1a1a] pt-2 border-t border-[#e0ddd6]">
              <span>Total</span>
              <span className="text-[#1a6b4a]">{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-[#e0ddd6] rounded-2xl p-5 sm:p-6">
          <label className="block text-sm font-semibold text-[#1a1a1a] mb-3">
            Notes <span className="text-[#aaa] font-normal">(optional)</span>
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Payment terms, bank details, or anything else for the client…"
            className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/invoices")}
            className="flex-1 sm:flex-none border border-[#e0ddd6] text-sm text-[#1a1a1a]
                       px-6 py-2.5 rounded-lg hover:bg-[#f5f4f0] transition-colors text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || clients.length === 0}
            className="flex-1 sm:flex-none bg-[#1a6b4a] text-white px-6 py-2.5 rounded-lg
                       text-sm font-medium hover:bg-[#2d9b6f] transition-colors disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
    </>
  );
}
