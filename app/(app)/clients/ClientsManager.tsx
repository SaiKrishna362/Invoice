// ============================================================
// app/(app)/clients/ClientsManager.tsx — Client List + CRUD UI
//
// Client component that renders the full clients page UI:
//   - Header with "+ Add Client" button
//   - Scrollable list of clients (name, email, GSTIN)
//   - "Add Client" modal with a shared ClientForm
//   - "Edit Client" modal with pre-filled ClientForm
//   - "Delete" confirm modal (with inline error if client has invoices)
//
// All mutations go through server actions (createClientAction,
// updateClientAction, deleteClientAction) via useActionState.
// The parent page (page.tsx) fetches the initial list server-side
// and passes it as `initialClients`; updates trigger Next.js cache
// revalidation so the list refreshes after every mutation.
// ============================================================

"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
} from "@/app/actions/client";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { Spinner } from "@/components/Spinner";
import { useNavigation } from "@/components/NavigationProgress";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gstin: string | null;
  address: string | null;
}

const EMPTY_FORM = { name: "", email: "", phone: "", gstin: "", address: "" };

/**
 * Reusable form used for both "Add" and "Edit" client modals.
 * Receives its server action, pending state, and default values from the parent.
 * A hidden `id` input is included when editing an existing client.
 */
function ClientForm({
  action,
  state,
  pending,
  defaultValues = EMPTY_FORM,
  hiddenId,
  submitLabel,
  onCancel,
  onDirty,
  onBeforeSubmit,
}: {
  action: (payload: FormData) => void;
  state: { error: string; success: boolean } | null;
  pending: boolean;
  defaultValues?: typeof EMPTY_FORM;
  hiddenId?: string;
  submitLabel: string;
  onCancel: () => void;
  onDirty?: () => void;
  onBeforeSubmit?: () => void;
}) {
  return (
    <form action={action} onSubmit={onBeforeSubmit} className="space-y-4" onInput={onDirty}>
      {hiddenId && <input type="hidden" name="id" value={hiddenId} />}

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Name *</label>
          <input
            name="name"
            defaultValue={defaultValues.name}
            required
            className="w-full px-3 py-2 text-sm border border-[#e0ddd6] rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Email *</label>
          <input
            name="email"
            type="email"
            defaultValue={defaultValues.email}
            required
            className="w-full px-3 py-2 text-sm border border-[#e0ddd6] rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Phone</label>
          <input
            name="phone"
            defaultValue={defaultValues.phone}
            placeholder="+91 98765 43210"
            className="w-full px-3 py-2 text-sm border border-[#e0ddd6] rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">GSTIN</label>
          <input
            name="gstin"
            defaultValue={defaultValues.gstin}
            placeholder="22AAAAA0000A1Z5"
            className="w-full px-3 py-2 text-sm border border-[#e0ddd6] rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Address</label>
        <textarea
          name="address"
          defaultValue={defaultValues.address}
          rows={2}
          placeholder="Street, City, State, PIN"
          className="w-full px-3 py-2 text-sm border border-[#e0ddd6] rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] resize-none"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="flex-1 border border-[#e0ddd6] text-sm text-[#1a1a1a] py-2.5 rounded-lg
                     hover:bg-[#f5f4f0] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-[#1a6b4a] text-white text-sm py-2.5 rounded-lg
                     hover:bg-[#2d9b6f] transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/**
 * Main client management component.
 * Receives the server-rendered client list and manages all modal state locally.
 *
 * Modal state:
 *   null      — no modal open
 *   "add"     — add-client modal
 *   Client    — edit-client modal for that specific client
 *
 * @param initialClients  List of the user's clients fetched server-side in page.tsx
 */
export function ClientsManager({ initialClients }: { initialClients: Client[] }) {
  const [modal, setModal] = useState<null | "add" | Client>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  // True once the user types anything in the open add/edit modal form.
  const [isModalDirty, setIsModalDirty] = useState(false);
  // When true, show the "unsaved changes" confirmation before closing the modal.
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Guards page-level navigation (back button, nav links, browser close).
  const { showPrompt, proceedNavigation, cancelNavigation, clearDirty } =
    useUnsavedChanges(isModalDirty);

  const [addState, addAction, addPending] = useActionState(createClientAction, null);
  const [editState, editAction, editPending] = useActionState(updateClientAction, null);
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState("");
  const { setNavigating } = useNavigation();
  const anyPending = addPending || editPending || deletePending;
  useEffect(() => { if (!anyPending) setNavigating(false); }, [anyPending]);

  useEffect(() => {
    if (addState?.success) {
      clearDirty();
      setIsModalDirty(false);
      setModal(null);
    }
  }, [addState]);

  useEffect(() => {
    if (editState?.success) {
      clearDirty();
      setIsModalDirty(false);
      setModal(null);
    }
  }, [editState]);

  // Close modal, prompting first if the form has unsaved edits.
  function requestCloseModal() {
    if (isModalDirty) {
      setShowCloseConfirm(true);
    } else {
      setModal(null);
    }
  }

  function confirmCloseModal() {
    setShowCloseConfirm(false);
    setIsModalDirty(false);
    clearDirty();
    setModal(null);
  }

  const editingClient = modal !== null && modal !== "add" ? modal : null;

  function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setNavigating(true);
    startDelete(async () => {
      const result = await deleteClientAction(id);
      if (result.success) {
        setDeleteTarget(null);
      } else {
        setDeleteError(result.error);
      }
    });
  }

  return (
    <>
      {/* Unsaved changes guard — navigation away from the page */}
      {showPrompt && (
        <UnsavedChangesModal
          onProceed={proceedNavigation}
          onCancel={cancelNavigation}
        />
      )}
      {/* Unsaved changes guard — closing the modal */}
      {showCloseConfirm && (
        <UnsavedChangesModal
          onProceed={confirmCloseModal}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-[#1a1a1a]">Clients</h1>
          <p className="text-sm text-[#6b6b6b] mt-1">{initialClients.length} client{initialClients.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setIsModalDirty(false); setModal("add"); }}
          className="bg-[#1a6b4a] text-white text-sm font-medium px-4 sm:px-5 py-2.5 rounded-lg
                     hover:bg-[#2d9b6f] transition-colors shrink-0 whitespace-nowrap"
        >
          <span className="hidden sm:inline">+ Add Client</span>
          <span className="sm:hidden">+ Add</span>
        </button>
      </div>

      {/* Client list */}
      {initialClients.length === 0 ? (
        <div className="bg-white border border-[#e0ddd6] rounded-xl text-center py-20 px-6">
          <p className="text-[#6b6b6b] text-sm mb-1">No clients yet</p>
          <p className="text-[#aaa] text-xs mb-5">Add your first client to start creating invoices</p>
          <button
            onClick={() => { setIsModalDirty(false); setModal("add"); }}
            className="inline-block bg-[#1a6b4a] text-white text-sm px-5 py-2.5 rounded-lg
                       hover:bg-[#2d9b6f] transition-colors"
          >
            Add Client
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#e0ddd6] rounded-xl overflow-hidden">
          {initialClients.map((client, i) => (
            <div
              key={client.id}
              className={`flex items-center gap-4 px-6 py-4 hover:bg-[#f9f8f6] transition-colors
                          ${i !== initialClients.length - 1 ? "border-b border-[#e0ddd6]" : ""}`}
            >
              <div className="w-9 h-9 rounded-full bg-[#e8f5ee] flex items-center justify-center shrink-0">
                <span className="text-[#1a6b4a] text-sm font-semibold">
                  {client.name[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1a1a]">{client.name}</p>
                <p className="text-xs text-[#6b6b6b] truncate">{client.email}</p>
                {client.gstin && (
                  <p className="text-xs text-[#aaa]">GSTIN: {client.gstin}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setIsModalDirty(false); setModal(client); }}
                  className="text-xs text-[#6b6b6b] hover:text-[#1a1a1a] px-3 py-1.5 rounded-lg
                             hover:bg-[#f0ece6] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => { setDeleteError(""); setDeleteTarget(client); }}
                  className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg
                             hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {modal === "add" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={requestCloseModal}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-[#1a1a1a] mb-5">Add Client</h2>
            <ClientForm
              action={addAction}
              state={addState}
              pending={addPending}
              submitLabel="Add Client"
              onCancel={requestCloseModal}
              onDirty={() => setIsModalDirty(true)}
              onBeforeSubmit={() => setNavigating(true)}
            />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={requestCloseModal}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-[#1a1a1a] mb-5">Edit Client</h2>
            <ClientForm
              key={editingClient.id}
              action={editAction}
              state={editState}
              pending={editPending}
              hiddenId={editingClient.id}
              defaultValues={{
                name:    editingClient.name,
                email:   editingClient.email,
                phone:   editingClient.phone    ?? "",
                gstin:   editingClient.gstin    ?? "",
                address: editingClient.address  ?? "",
              }}
              submitLabel="Save Changes"
              onCancel={requestCloseModal}
              onDirty={() => setIsModalDirty(true)}
              onBeforeSubmit={() => setNavigating(true)}
            />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-[#1a1a1a] mb-1">Delete client?</h2>
            <p className="text-sm text-[#6b6b6b] mb-4">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deletePending}
                className="flex-1 border border-[#e0ddd6] text-sm text-[#1a1a1a] py-2.5 rounded-lg
                           hover:bg-[#f5f4f0] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletePending}
                className="flex-1 bg-red-500 text-white text-sm py-2.5 rounded-lg
                           hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deletePending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
