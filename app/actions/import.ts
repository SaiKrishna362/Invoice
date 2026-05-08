// ============================================================
// app/actions/import.ts — Invoice Import Server Actions
//
// Two-step import flow:
//
//   Step 1 — parseInvoiceFileAction(FormData)
//     Reads the uploaded file (CSV / Excel / PDF) and returns a
//     list of ParsedInvoice objects for the user to review and
//     edit in the browser. No database writes happen here.
//
//   Step 2 — createImportedInvoicesAction(ParsedInvoice[])
//     Takes the (possibly edited) preview data, validates it
//     server-side, upserts clients by email, and creates the
//     invoices + line items in the database.
//
// Limits:
//   - Max file size:        4 MB
//   - Max invoices per run: 100
//   - Max items per invoice: 50
//   - Accepted formats:     .csv, .xls, .xlsx, .pdf
// ============================================================

"use server";

import { auth }          from "@/auth";
import { db }            from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseCsvExcel, parsePdf, ParsedInvoice } from "@/lib/invoice-parser";
import { generateInvoiceNo } from "@/lib/utils";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

// Return type for the parse step
export interface ParseFileResult {
  error:       string;           // Top-level error (file rejected before parsing)
  invoices:    ParsedInvoice[];  // Successfully parsed invoices
  parseErrors: string[];         // Row-level warnings (skipped rows, etc.)
}

// Return type for the create step
export interface ImportResult {
  error:   string;
  created: { invoiceId: string; invoiceNo: string }[]; // Newly created invoice IDs + numbers
}

// ────────────────────────────────────────────────────────────────────────────
// Step 1: Parse uploaded file → preview data (no DB writes)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Accepts a multipart form upload with a single "file" field,
 * validates the type and size, then delegates to the appropriate
 * parser (CSV/Excel or PDF).
 *
 * Called from ImportForm.tsx when the user drops or selects a file.
 * Returns parsed invoice previews so the user can review/edit them.
 */
export async function parseInvoiceFileAction(formData: FormData): Promise<ParseFileResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", invoices: [], parseErrors: [] };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided.", invoices: [], parseErrors: [] };

  const name    = file.name.toLowerCase();
  const allowed = [".csv", ".xls", ".xlsx", ".pdf"];

  if (!allowed.some(ext => name.endsWith(ext))) {
    return {
      error: "Unsupported file type. Please upload a CSV, Excel, or PDF file.",
      invoices: [],
      parseErrors: [],
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { error: "File is too large. Maximum size is 4 MB.", invoices: [], parseErrors: [] };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    // Route to the correct parser based on file extension
    const result = name.endsWith(".pdf")
      ? await parsePdf(buffer)
      : await parseCsvExcel(buffer, file.name);

    if (!result.invoices.length && !result.errors.length) {
      return { error: "The file appears to be empty or has no valid data.", invoices: [], parseErrors: [] };
    }

    return { error: "", invoices: result.invoices, parseErrors: result.errors };
  } catch (err) {
    console.error("[import] parse error:", err);
    return {
      error: "Failed to read the file. Make sure it is a valid CSV, Excel, or PDF.",
      invoices: [],
      parseErrors: [],
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Step 2: Create invoices from the validated preview data
// ────────────────────────────────────────────────────────────────────────────

/**
 * Validates and persists all invoices from the import preview.
 * All invoices are validated first — if any fail, none are created.
 *
 * For each invoice:
 *   - Clients are upserted by email within the current user's account.
 *     If a client with that email already exists they are reused;
 *     otherwise a new client record is created.
 *   - Invoice numbers follow the standard INV-NNN sequence.
 *
 * Called from ImportForm.tsx when the user clicks "Import N invoices".
 */
export async function createImportedInvoicesAction(
  invoices: ParsedInvoice[]
): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", created: [] };

  const userId = session.user.id;

  if (!Array.isArray(invoices) || invoices.length === 0) {
    return { error: "No invoices to import.", created: [] };
  }

  if (invoices.length > 100) {
    return { error: "Maximum 100 invoices per import.", created: [] };
  }

  // ── Full validation pass before any DB writes ─────────────────────────
  // We validate everything up front so we don't end up with partial imports
  for (let i = 0; i < invoices.length; i++) {
    const inv   = invoices[i];
    const label = `Invoice ${i + 1}`;

    if (!inv.clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inv.clientEmail)) {
      return { error: `${label}: invalid client email.`, created: [] };
    }
    if (!inv.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(inv.dueDate)) {
      return { error: `${label}: invalid due date.`, created: [] };
    }
    if (!Array.isArray(inv.items) || inv.items.length === 0) {
      return { error: `${label}: must have at least one line item.`, created: [] };
    }
    if (inv.items.length > 50) {
      return { error: `${label}: maximum 50 line items per invoice.`, created: [] };
    }
    for (const item of inv.items) {
      if (!item.description || item.description.length > 500) {
        return { error: `${label}: item description is missing or too long.`, created: [] };
      }
      if (!isFinite(item.quantity) || item.quantity <= 0) {
        return { error: `${label}: item quantity must be positive.`, created: [] };
      }
      if (!isFinite(item.rate) || item.rate < 0) {
        return { error: `${label}: item rate must be non-negative.`, created: [] };
      }
    }
    const gst = inv.gstPercent ?? 18;
    if (!isFinite(gst) || gst < 0 || gst > 100) {
      return { error: `${label}: GST% must be between 0 and 100.`, created: [] };
    }
  }

  // ── Write each invoice to the database ───────────────────────────────
  const created: { invoiceId: string; invoiceNo: string }[] = [];

  try {
    for (const inv of invoices) {
      // Find an existing client with this email, or create a new one
      let client = await db.client.findFirst({
        where: { userId, email: inv.clientEmail.toLowerCase() },
      });

      if (!client) {
        client = await db.client.create({
          data: {
            userId,
            name:  inv.clientName || inv.clientEmail,
            email: inv.clientEmail.toLowerCase(),
          },
        });
      }

      // Calculate totals — rounded to 2 decimal places to avoid float drift
      const gstPercent = inv.gstPercent ?? 18;
      const items = inv.items.map(it => ({
        description: it.description.trim(),
        quantity:    it.quantity,
        rate:        it.rate,
        amount:      Math.round(it.quantity * it.rate * 100) / 100,
      }));

      const subtotal  = Math.round(items.reduce((s, it) => s + it.amount, 0) * 100) / 100;
      const gstAmount = Math.round(subtotal * (gstPercent / 100) * 100) / 100;
      const total     = Math.round((subtotal + gstAmount) * 100) / 100;

      // Each invoice gets a unique, collision-free ID — no DB query, no race condition
      const invoiceNo = generateInvoiceNo();

      const invoice = await db.invoice.create({
        data: {
          invoiceNo,
          userId,
          clientId:  client.id,
          dueDate:   new Date(inv.dueDate),
          gstPercent,
          subtotal,
          gstAmount,
          total,
          notes:     inv.notes || null,
          items:     { create: items },
        },
      });

      created.push({ invoiceId: invoice.id, invoiceNo });
    }
  } catch (err) {
    console.error("[import] DB write error:", err);
    return { error: "Failed to save invoices. Please try again.", created: [] };
  }

  // Refresh the invoice list and dashboard so new records show up immediately
  revalidatePath("/invoices");
  revalidatePath("/dashboard");

  return { error: "", created };
}
