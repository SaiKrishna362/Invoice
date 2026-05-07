// ============================================================
// app/(app)/invoices/InvoiceListActions.tsx — Per-Row Actions in Invoice List
//
// Client component rendered once per invoice row on the list page.
// Provides "View →" and "Delete" actions inline without navigating
// to the detail page first.
//
// On delete confirmation the action redirects back to /invoices,
// which re-renders with the row removed (revalidatePath is called
// inside deleteInvoiceAction before the redirect).
// ============================================================

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteInvoiceAction } from "@/app/actions/invoice";

/**
 * Renders "View →" + "Delete" for a single invoice row.
 * Delete shows an inline confirm modal before calling the server action.
 *
 * @param invoiceId  Database ID used by the server action
 * @param invoiceNo  Human-readable number shown in the confirm dialog
 */
export function InvoiceListActions({
  invoiceId,
  invoiceNo,
}: {
  invoiceId: string;
  invoiceNo: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteInvoiceAction(invoiceId);
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 justify-end">
        <Link
          href={`/invoices/${invoiceId}`}
          className="text-xs text-[#2d9b6f] hover:underline whitespace-nowrap"
        >
          View →
        </Link>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={pending}
          className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 whitespace-nowrap"
          aria-label={`Delete ${invoiceNo}`}
        >
          Delete
        </button>
      </div>

      {/* Confirm modal — portal-style fixed overlay */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning icon */}
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>

            <h2 className="text-base font-semibold text-[#1a1a1a] text-center mb-1">
              Delete invoice?
            </h2>
            <p className="text-sm text-[#6b6b6b] text-center mb-1 font-medium">{invoiceNo}</p>
            <p className="text-sm text-[#6b6b6b] text-center mb-6">
              This action cannot be undone. The invoice and all its line items will be permanently deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
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
                           hover:bg-red-600 transition-colors disabled:opacity-50 font-medium"
              >
                {pending ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
