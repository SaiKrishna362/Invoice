// ============================================================
// app/(app)/invoices/import/ImportForm.tsx — Import Flow UI
//
// Client component that drives the full 3-step import flow:
//
//   Step 1 "upload"    — Drag-and-drop / browse zone + CSV format hint table.
//                        On file selection, calls parseInvoiceFileAction
//                        (server action) which returns preview data.
//
//   Step 2 "preview"   — Editable cards for every parsed invoice.
//                        User can fix extracted values, add/remove items,
//                        and remove entire invoices before committing.
//                        On confirm, calls createImportedInvoicesAction.
//
//   Step 3 "done"      — Success screen showing links to each created invoice.
//
// Sub-components:
//   InvoiceCard  — One editable card per parsed invoice in the preview step
//   Field        — Label + input wrapper used inside InvoiceCard
//
// normalise()  — Ensures all ParsedInvoice values have safe defaults before
//                they enter React state (prevents undefined in controlled inputs)
// ============================================================

"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { parseInvoiceFileAction, createImportedInvoicesAction } from "@/app/actions/import";
import { ParsedInvoice, ParsedItem } from "@/lib/invoice-parser";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import { useNavigation } from "@/components/NavigationProgress";

type Step = "upload" | "preview" | "importing" | "done";

interface Created { invoiceId: string; invoiceNo: string }

const MAX_FILE_BYTES = 4 * 1024 * 1024;

const ACCEPTED = ".csv,.xls,.xlsx,.pdf";

/** Top-level import wizard component. Manages step state and all parsed invoice data. */
export default function ImportForm() {
  const [step, setStep]             = useState<Step>("upload");
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver]     = useState(false);
  const { setNavigating } = useNavigation();
  useEffect(() => { if (!isPending) setNavigating(false); }, [isPending]);

  // Dirty when there are parsed invoices the user hasn't committed or discarded yet.
  const isDirty = step === "preview" || step === "importing";
  const { showPrompt, proceedNavigation, cancelNavigation, clearDirty } =
    useUnsavedChanges(isDirty);

  // Prompt before discarding preview edits via the in-step "Change file" / "Cancel" buttons.
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  function requestReset() {
    if (isDirty) {
      setShowResetConfirm(true);
    } else {
      reset();
    }
  }

  function confirmReset() {
    setShowResetConfirm(false);
    clearDirty();
    reset();
  }

  // Upload step
  const [uploadError, setUploadError] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview step
  const [invoices, setInvoices] = useState<ParsedInvoice[]>([]);

  // Done step
  const [created, setCreated]     = useState<Created[]>([]);
  const [importError, setImportError] = useState("");

  // ── Upload ──────────────────────────────────────────────────────────────

  function handleFile(file: File) {
    setUploadError("");
    if (file.size > MAX_FILE_BYTES) { setUploadError("File is too large. Maximum size is 4 MB."); return; }
    const name = file.name.toLowerCase();
    if (![".csv", ".xls", ".xlsx", ".pdf"].some(e => name.endsWith(e))) {
      setUploadError("Unsupported file type. Please upload a CSV, Excel, or PDF file.");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    setNavigating(true);
    startTransition(async () => {
      const res = await parseInvoiceFileAction(fd);
      if (res.error) { setUploadError(res.error); return; }
      setParseErrors(res.parseErrors);
      setInvoices(res.invoices.map(normalise));
      setStep("preview");
    });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  // ── Preview editing ──────────────────────────────────────────────────────

  function updateInvoice(idx: number, field: keyof ParsedInvoice, value: string | number) {
    setInvoices(prev => prev.map((inv, i) =>
      i === idx ? { ...inv, [field]: value } : inv
    ));
  }

  function updateItem(invIdx: number, itemIdx: number, field: keyof ParsedItem, value: string | number) {
    setInvoices(prev => prev.map((inv, i) => {
      if (i !== invIdx) return inv;
      const items = inv.items.map((it, j) => j === itemIdx ? { ...it, [field]: value } : it);
      return { ...inv, items };
    }));
  }

  function addItem(invIdx: number) {
    setInvoices(prev => prev.map((inv, i) =>
      i === invIdx
        ? { ...inv, items: [...inv.items, { description: "", quantity: 1, rate: 0 }] }
        : inv
    ));
  }

  function removeItem(invIdx: number, itemIdx: number) {
    setInvoices(prev => prev.map((inv, i) => {
      if (i !== invIdx) return inv;
      const items = inv.items.filter((_, j) => j !== itemIdx);
      return { ...inv, items };
    }));
  }

  function removeInvoice(idx: number) {
    setInvoices(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Import ──────────────────────────────────────────────────────────────

  function handleImport() {
    setImportError("");
    setNavigating(true);
    startTransition(async () => {
      setStep("importing");
      const res = await createImportedInvoicesAction(invoices);
      if (res.error) { setImportError(res.error); setStep("preview"); return; }
      setCreated(res.created);
      clearDirty();
      setStep("done");
    });
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  function reset() {
    setStep("upload");
    setUploadError("");
    setParseErrors([]);
    setInvoices([]);
    setCreated([]);
    setImportError("");
  }

  // ────────────────────────────────────────────────────────────────────────

  const guard = (
    <>
      {showPrompt && (
        <UnsavedChangesModal onProceed={proceedNavigation} onCancel={cancelNavigation} />
      )}
      {showResetConfirm && (
        <UnsavedChangesModal onProceed={confirmReset} onCancel={() => setShowResetConfirm(false)} />
      )}
    </>
  );

  if (step === "done") {
    return (
      <>
      {guard}
      <div className="bg-white border border-[#e0ddd6] rounded-xl p-8 text-center">
        <div className="w-14 h-14 bg-[#e8f5ef] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#1a6b4a]" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">
          {created.length} invoice{created.length !== 1 ? "s" : ""} imported
        </h2>
        <p className="text-sm text-[#6b6b6b] mb-6">All records have been created successfully.</p>

        <div className="flex flex-col gap-2 mb-6 max-h-48 overflow-y-auto">
          {created.map(c => (
            <NavLink
              key={c.invoiceId}
              href={`/invoices/${c.invoiceId}`}
              className="text-sm text-[#2d9b6f] hover:underline"
            >
              {c.invoiceNo} →
            </NavLink>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <NavLink
            href="/invoices"
            className="px-5 py-2.5 bg-[#1a6b4a] text-white text-sm font-medium rounded-lg hover:bg-[#2d9b6f] transition-colors"
            spinnerClassName="w-4 h-4"
          >
            View all invoices
          </NavLink>
          <button
            onClick={reset}
            className="px-5 py-2.5 border border-[#e0ddd6] text-sm font-medium rounded-lg text-[#6b6b6b] hover:bg-[#f5f4f0] transition-colors"
          >
            Import another file
          </button>
        </div>
      </div>
      </>
    );
  }

  if (step === "preview" || step === "importing") {
    const total = invoices.length;
    return (
      <>
      {guard}
      <div>
        {/* Parse warnings */}
        {parseErrors.length > 0 && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-1">Some rows were skipped</p>
            <ul className="list-disc list-inside space-y-0.5">
              {parseErrors.map((e, i) => (
                <li key={i} className="text-xs text-amber-700">{e}</li>
              ))}
            </ul>
          </div>
        )}

        {importError && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{importError}</p>
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="bg-white border border-[#e0ddd6] rounded-xl p-10 text-center">
            <p className="text-[#6b6b6b] text-sm mb-4">No valid invoices found in the file.</p>
            <button onClick={reset} className="text-sm text-[#1a6b4a] hover:underline">Try another file</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[#6b6b6b]">
                {total} invoice{total !== 1 ? "s" : ""} ready to import — review and edit below
              </p>
              <button onClick={requestReset} className="text-xs text-[#6b6b6b] hover:text-[#1a1a1a]">
                ← Change file
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {invoices.map((inv, invIdx) => (
                <InvoiceCard
                  key={invIdx}
                  inv={inv}
                  invIdx={invIdx}
                  onUpdate={(f, v) => updateInvoice(invIdx, f, v)}
                  onUpdateItem={(ii, f, v) => updateItem(invIdx, ii, f, v)}
                  onAddItem={() => addItem(invIdx)}
                  onRemoveItem={ii => removeItem(invIdx, ii)}
                  onRemove={() => removeInvoice(invIdx)}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={step === "importing"}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1a6b4a] text-white text-sm font-medium
                           rounded-lg hover:bg-[#2d9b6f] disabled:opacity-60 transition-colors"
              >
                {step === "importing" ? "Importing…" : `Import ${total} invoice${total !== 1 ? "s" : ""}`}
              </button>
              <button
                onClick={requestReset}
                disabled={step === "importing"}
                className="px-5 py-2.5 border border-[#e0ddd6] text-sm rounded-lg text-[#6b6b6b]
                           hover:bg-[#f5f4f0] disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
      </>
    );
  }

  // Upload step
  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative cursor-pointer border-2 border-dashed rounded-xl p-12 text-center transition-colors
          ${dragOver ? "border-[#1a6b4a] bg-[#e8f5ef]" : "border-[#d0cdc5] bg-white hover:border-[#1a6b4a] hover:bg-[#f5faf7]"}
          ${isPending ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={onInputChange}
          disabled={isPending}
        />

        <div className="w-14 h-14 bg-[#f5f4f0] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#6b6b6b]" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        {isPending ? (
          <div className="text-sm text-[#6b6b6b]">Reading file…</div>
        ) : (
          <>
            <p className="text-sm font-medium text-[#1a1a1a]">Drop your file here or click to browse</p>
            <p className="text-xs text-[#6b6b6b] mt-1">CSV, Excel (.xls / .xlsx), or PDF — max 4 MB</p>
          </>
        )}
      </div>

      {uploadError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{uploadError}</p>
      )}

      {/* Template hint */}
      <div className="bg-[#f9f8f6] border border-[#e0ddd6] rounded-xl p-5">
        <p className="text-xs font-semibold text-[#1a1a1a] uppercase tracking-wide mb-3">
          CSV / Excel column format
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs text-[#6b6b6b] w-max">
            <thead>
              <tr className="border-b border-[#e0ddd6]">
                {["client_name","client_email","due_date","gst_percent","notes","item_description","item_quantity","item_rate"].map(h => (
                  <th key={h} className="pb-2 pr-4 font-mono text-left text-[#1a1a1a]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pt-2 pr-4">Acme Corp</td>
                <td className="pt-2 pr-4">acme@example.com</td>
                <td className="pt-2 pr-4">2025-06-30</td>
                <td className="pt-2 pr-4">18</td>
                <td className="pt-2 pr-4">Q2 work</td>
                <td className="pt-2 pr-4">Logo design</td>
                <td className="pt-2 pr-4">5</td>
                <td className="pt-2 pr-4">1000</td>
              </tr>
              <tr>
                <td className="pt-1 pr-4"></td>
                <td className="pt-1 pr-4 text-[#aaa]">same email</td>
                <td className="pt-1 pr-4 text-[#aaa]">same date</td>
                <td className="pt-1 pr-4"></td>
                <td className="pt-1 pr-4"></td>
                <td className="pt-1 pr-4">Brand guidelines</td>
                <td className="pt-1 pr-4">1</td>
                <td className="pt-1 pr-4">5000</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[#aaa] mt-3">
          Rows with the same <span className="font-mono">client_email</span> + <span className="font-mono">due_date</span> are merged into one invoice.
          <br/>Date formats accepted: YYYY-MM-DD, DD/MM/YYYY, or natural language (e.g. 30 Jun 2025).
        </p>
      </div>
    </div>
  );
}

// ── InvoiceCard ─────────────────────────────────────────────────────────────

/**
 * Editable preview card for a single parsed invoice.
 * All fields are controlled inputs — changes bubble up via the onUpdate* callbacks.
 * Live totals (subtotal, GST, total) are calculated from the current item values.
 */
function InvoiceCard({
  inv, invIdx, onUpdate, onUpdateItem, onAddItem, onRemoveItem, onRemove
}: {
  inv: ParsedInvoice;
  invIdx: number;
  onUpdate: (f: keyof ParsedInvoice, v: string | number) => void;
  onUpdateItem: (ii: number, f: keyof ParsedItem, v: string | number) => void;
  onAddItem: () => void;
  onRemoveItem: (ii: number) => void;
  onRemove: () => void;
}) {
  const subtotal  = inv.items.reduce((s, it) => s + it.quantity * it.rate, 0);
  const gstAmount = subtotal * (inv.gstPercent / 100);
  const total     = subtotal + gstAmount;

  const fmt = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

  return (
    <div className="bg-white border border-[#e0ddd6] rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#e0ddd6] bg-[#f9f8f6]">
        <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">Invoice {invIdx + 1}</span>
        <button
          onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Client + dates row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Client name">
            <input
              type="text"
              value={inv.clientName}
              onChange={e => onUpdate("clientName", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Client email *">
            <input
              type="email"
              value={inv.clientEmail}
              onChange={e => onUpdate("clientEmail", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Due date *">
            <input
              type="date"
              value={inv.dueDate}
              onChange={e => onUpdate("dueDate", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="GST %">
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={inv.gstPercent}
              onChange={e => onUpdate("gstPercent", parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <input
            type="text"
            value={inv.notes}
            onChange={e => onUpdate("notes", e.target.value)}
            className={inputCls}
          />
        </Field>

        {/* Line items */}
        <div>
          <p className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide mb-2">Line items</p>
          <div className="space-y-2">
            {inv.items.map((it, ii) => (
              <div key={ii} className="grid grid-cols-[1fr_80px_90px_36px] gap-2 items-center">
                <input
                  type="text"
                  placeholder="Description"
                  value={it.description}
                  onChange={e => onUpdateItem(ii, "description", e.target.value)}
                  className={inputCls}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min={0}
                  step={0.01}
                  value={it.quantity}
                  onChange={e => onUpdateItem(ii, "quantity", parseFloat(e.target.value) || 0)}
                  className={`${inputCls} text-right`}
                />
                <input
                  type="number"
                  placeholder="Rate"
                  min={0}
                  step={0.01}
                  value={it.rate}
                  onChange={e => onUpdateItem(ii, "rate", parseFloat(e.target.value) || 0)}
                  className={`${inputCls} text-right`}
                />
                <button
                  onClick={() => onRemoveItem(ii)}
                  disabled={inv.items.length === 1}
                  className="text-[#aaa] hover:text-red-500 disabled:opacity-30 transition-colors text-lg leading-none"
                  title="Remove item"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={onAddItem}
            className="mt-2 text-xs text-[#1a6b4a] hover:underline"
          >
            + Add item
          </button>
        </div>

        {/* Totals */}
        <div className="border-t border-[#e0ddd6] pt-3 text-xs text-right space-y-1 text-[#6b6b6b]">
          <p>Subtotal: <span className="text-[#1a1a1a]">{fmt(subtotal)}</span></p>
          <p>GST ({inv.gstPercent}%): <span className="text-[#1a1a1a]">{fmt(gstAmount)}</span></p>
          <p className="text-sm font-semibold text-[#1a1a1a]">Total: {fmt(total)}</p>
        </div>
      </div>
    </div>
  );
}

/** Simple label + input wrapper used inside InvoiceCard fields. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-[#6b6b6b] mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-[#e0ddd6] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]/20 focus:border-[#1a6b4a] transition-colors";

/**
 * Fills in safe defaults for any fields that the parser might have left
 * undefined or null, so React controlled inputs never receive undefined.
 */
function normalise(inv: ParsedInvoice): ParsedInvoice {
  return {
    ...inv,
    clientName:  inv.clientName  || "",
    clientEmail: inv.clientEmail || "",
    dueDate:     inv.dueDate     || "",
    gstPercent:  typeof inv.gstPercent === "number" ? inv.gstPercent : 18,
    notes:       inv.notes       || "",
    items:       (inv.items || []).map(it => ({
      description: it.description || "",
      quantity:    typeof it.quantity === "number" ? it.quantity : 1,
      rate:        typeof it.rate    === "number" ? it.rate    : 0,
    })),
  };
}
