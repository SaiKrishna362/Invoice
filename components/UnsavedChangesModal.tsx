// ============================================================
// components/UnsavedChangesModal.tsx — Unsaved Changes Confirmation Modal
//
// Rendered by any form that uses useUnsavedChanges() when the user
// tries to navigate away with unsaved edits.
//
// Props:
//   onProceed — called when the user confirms they want to leave
//   onCancel  — called when the user wants to stay on the page
//
// The backdrop click calls onCancel (treat it as "stay").
// ============================================================

"use client";

/**
 * Modal dialog that warns the user about unsaved changes.
 *
 * @param onProceed  User confirmed navigation — leave the page
 * @param onCancel   User cancelled — stay on the current page
 */
export function UnsavedChangesModal({
  onProceed,
  onCancel,
}: {
  onProceed: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] px-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
        // Stop clicks inside the modal from bubbling to the backdrop.
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-[#1a1a1a] text-center mb-2">
          Unsaved changes
        </h2>
        <p className="text-sm text-[#6b6b6b] text-center mb-6">
          You have unsaved changes. If you leave now, your changes will be lost.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-[#e0ddd6] text-sm text-[#1a1a1a] py-2.5 rounded-lg
                       hover:bg-[#f5f4f0] transition-colors font-medium"
          >
            Stay on page
          </button>
          <button
            onClick={onProceed}
            className="flex-1 bg-red-500 text-white text-sm py-2.5 rounded-lg
                       hover:bg-red-600 transition-colors font-medium"
          >
            Leave anyway
          </button>
        </div>
      </div>
    </div>
  );
}
