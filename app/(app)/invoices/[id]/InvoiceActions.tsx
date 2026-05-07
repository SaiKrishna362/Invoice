// ============================================================
// app/(app)/invoices/[id]/InvoiceActions.tsx — Invoice Action Sidebar
//
// Client component that renders the action buttons on the invoice
// detail page sidebar. All mutations call server actions directly
// via useTransition (no forms needed — simple button clicks).
//
// Buttons shown depend on the current status:
//   Any status  — Download PDF (link to /api/invoices/:id/pdf)
//   Non-PAID    — Send Invoice (generates PDF + emails client)
//   SENT        — Mark as Paid / Mark as Sent (revert)
//   PAID        — Mark as Sent (revert to sent)
//   DRAFT/OVR   — Toggle between Draft ↔ Overdue
//   Any status  — Delete Invoice (with confirm modal)
//
// `activeAction` tracks which button is in-flight so each button
// shows its own spinner without disabling all other buttons.
// ============================================================

"use client";

import { useState, useTransition, useEffect } from "react";
import {
  updateInvoiceStatusAction,
  deleteInvoiceAction,
  sendInvoiceAction,
} from "@/app/actions/invoice";
import { useNavigation } from "@/components/NavigationProgress";

type Status = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

/**
 * Sidebar action panel for an individual invoice.
 *
 * @param invoiceId   Database ID of the invoice
 * @param status      Current invoice status — determines which buttons appear
 * @param clientEmail Shown in the success banner after sending the invoice
 */
export function InvoiceActions({
  invoiceId,
  status,
  clientEmail,
}: {
  invoiceId: string;
  status: Status;
  clientEmail: string;
}) {
  const [pending, startTransition] = useTransition();
  const [sendResult, setSendResult] = useState<{ error: string; success: boolean } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const { setNavigating } = useNavigation();
  useEffect(() => { if (!pending) setNavigating(false); }, [pending]);

  function run(action: string, fn: () => Promise<void> | void) {
    setActiveAction(action);
    setNavigating(true);
    startTransition(async () => {
      await fn();
      setActiveAction(null);
    });
  }

  function handleSend() {
    setSendResult(null);
    run("send", async () => {
      const result = await sendInvoiceAction(invoiceId);
      setSendResult(result);
    });
  }

  function handleStatus(s: Status) {
    run(s, () => updateInvoiceStatusAction(invoiceId, s));
  }

  function handleDelete() {
    run("delete", () => deleteInvoiceAction(invoiceId));
  }

  const isBusy = (action: string) => pending && activeAction === action;

  return (
    <div className="space-y-3">

      {/* Send result banner */}
      {sendResult?.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 break-all">
          Invoice sent to {clientEmail}.
        </div>
      )}
      {sendResult?.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {sendResult.error}
        </div>
      )}

      {/* Download PDF */}
      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full border border-[#e0ddd6] text-sm
                   text-[#1a1a1a] py-2.5 rounded-lg hover:bg-[#f5f4f0] transition-colors font-medium"
      >
        Download PDF
      </a>

      {/* Send Invoice */}
      {status !== "PAID" && (
        <button
          onClick={handleSend}
          disabled={pending}
          className="w-full bg-[#1a6b4a] text-white text-sm py-2.5 rounded-lg
                     hover:bg-[#2d9b6f] transition-colors font-medium disabled:opacity-60"
        >
          {isBusy("send") ? "Sending…" : "Send Invoice"}
        </button>
      )}

      {/* Status transitions */}
      {status === "SENT" && (
        <button
          onClick={() => handleStatus("PAID")}
          disabled={pending}
          className="w-full bg-green-600 text-white text-sm py-2.5 rounded-lg
                     hover:bg-green-700 transition-colors font-medium disabled:opacity-60"
        >
          {isBusy("PAID") ? "Updating…" : "Mark as Paid"}
        </button>
      )}

      {status === "PAID" && (
        <button
          onClick={() => handleStatus("SENT")}
          disabled={pending}
          className="w-full border border-[#e0ddd6] text-sm text-[#6b6b6b] py-2.5 rounded-lg
                     hover:bg-[#f5f4f0] transition-colors disabled:opacity-60"
        >
          {isBusy("SENT") ? "Updating…" : "Mark as Sent"}
        </button>
      )}

      {status === "OVERDUE" && (
        <button
          onClick={() => handleStatus("PAID")}
          disabled={pending}
          className="w-full bg-green-600 text-white text-sm py-2.5 rounded-lg
                     hover:bg-green-700 transition-colors font-medium disabled:opacity-60"
        >
          {isBusy("PAID") ? "Updating…" : "Mark as Paid"}
        </button>
      )}

      {(status === "DRAFT" || status === "OVERDUE") && (
        <button
          onClick={() => handleStatus("OVERDUE" === status ? "DRAFT" : "OVERDUE")}
          disabled={pending}
          className="w-full border border-[#e0ddd6] text-sm text-[#6b6b6b] py-2.5 rounded-lg
                     hover:bg-[#f5f4f0] transition-colors disabled:opacity-60"
        >
          {status === "DRAFT"
            ? isBusy("OVERDUE") ? "Updating…" : "Mark as Overdue"
            : isBusy("DRAFT")   ? "Updating…" : "Revert to Draft"}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => setShowDeleteConfirm(true)}
        disabled={pending}
        className="w-full border border-red-200 text-red-500 text-sm py-2.5 rounded-lg
                   hover:bg-red-50 transition-colors disabled:opacity-60"
      >
        Delete Invoice
      </button>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
             onClick={() => { if (!pending) setShowDeleteConfirm(false); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
               onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-[#1a1a1a] mb-1">Delete invoice?</h2>
            <p className="text-sm text-[#6b6b6b] mb-6">
              This action cannot be undone. The invoice will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={pending}
                className="flex-1 border border-[#e0ddd6] text-sm text-[#1a1a1a] py-2.5 rounded-lg
                           hover:bg-[#f5f4f0] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={pending}
                className="flex-1 bg-red-500 text-white text-sm py-2.5 rounded-lg
                           hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isBusy("delete") ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
