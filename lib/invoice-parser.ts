// ============================================================
// lib/invoice-parser.ts — File Import Parser
//
// Parses uploaded CSV, Excel (.xls/.xlsx), and PDF files into
// a normalised list of ParsedInvoice objects that can be
// reviewed and then saved to the database.
//
// CSV / Excel expected columns (case-insensitive, underscore-separated):
//   client_name | client_email | due_date | gst_percent | notes
//   item_description | item_quantity | item_rate
//
// Rows with the same (client_email + due_date) are automatically
// merged into a single invoice with multiple line items.
//
// PDF parsing is best-effort: it extracts text and applies
// heuristics to find the email, dates, GST%, and line items.
//
// Used by: app/actions/import.ts
// ============================================================

import ExcelJS from "exceljs";

// Shape of a single invoice line item after parsing
export interface ParsedItem {
  description: string;
  quantity:    number;
  rate:        number;
}

// Shape of one parsed invoice, ready for preview / editing before DB write
export interface ParsedInvoice {
  clientName:  string;
  clientEmail: string;
  dueDate:     string;   // Normalised to YYYY-MM-DD
  gstPercent:  number;
  notes:       string;
  items:       ParsedItem[];
  _rowHint?:   string;   // e.g. "Row 2" — shown in parse error messages
}

// Return value from both parse functions
export interface ParseResult {
  invoices:  ParsedInvoice[];
  errors:    string[];        // Non-fatal row-level warnings shown to the user
}

// ────────────────────────────────────────────────────────────────────────────
// CSV / Excel parser
// ────────────────────────────────────────────────────────────────────────────

/**
 * Parses a CSV or Excel buffer into invoice previews.
 * Rows are grouped by (client_email, due_date) — each unique combination
 * becomes one invoice, and every row in that group becomes a line item.
 *
 * @param buffer   Raw file bytes
 * @param filename Original filename (used to detect .csv vs .xlsx)
 * @returns        Parsed invoices and any row-level error messages
 */
export async function parseCsvExcel(buffer: Buffer, filename: string): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();

  if (filename.toLowerCase().endsWith(".csv")) {
    // Stream the CSV text through the ExcelJS CSV reader
    const { Readable } = await import("stream");
    const stream = Readable.from(buffer.toString("utf8"));
    await wb.csv.read(stream);
  } else {
    // Load .xls or .xlsx binary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buffer as any);
  }

  // Use the first worksheet — multi-sheet files are not currently supported
  const ws = wb.worksheets[0];
  if (!ws) return { invoices: [], errors: ["The file contains no worksheets."] };

  // ── Build a header map: column index → normalised key ──────────────────
  // Normalise: lowercase + collapse whitespace to underscore
  // so "Client Email" and "client_email" both map to "client_email"
  const headerRow = ws.getRow(1);
  const headers: Record<number, string> = {};
  headerRow.eachCell((cell, colNumber) => {
    const raw = String(cell.value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    headers[colNumber] = raw;
  });

  // Enforce required columns — reject the file early with a clear message
  const required = ["client_email", "due_date", "item_description", "item_quantity", "item_rate"];
  const missing  = required.filter(k => !Object.values(headers).includes(k));
  if (missing.length) {
    return {
      invoices: [],
      errors: [`Missing required columns: ${missing.join(", ")}. See the template for the expected format.`],
    };
  }

  // ── Group data rows by (client_email, due_date) ───────────────────────
  // Each group will become one invoice with multiple line items
  const groups = new Map<string, { rows: Record<string, string>[]; rowNums: number[] }>();
  const errors: string[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    // Read all cells into a key→value map
    const cells: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col];
      if (key) cells[key] = String(cell.value ?? "").trim();
    });

    const email   = (cells["client_email"] ?? "").toLowerCase().trim();
    const dueDate = normaliseDateString(cells["due_date"] ?? "");

    // Both fields are required to form a valid group key
    if (!email || !dueDate) {
      errors.push(`Row ${rowNumber}: missing client_email or due_date — skipped.`);
      return;
    }

    const groupKey = `${email}||${dueDate}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { rows: [], rowNums: [] });
    groups.get(groupKey)!.rows.push(cells);
    groups.get(groupKey)!.rowNums.push(rowNumber);
  });

  // ── Convert each group into a ParsedInvoice ───────────────────────────
  const invoices: ParsedInvoice[] = [];

  for (const [, { rows, rowNums }] of groups) {
    const first = rows[0];
    const email   = first["client_email"].toLowerCase();
    const dueDate = normaliseDateString(first["due_date"]);

    if (!dueDate) {
      errors.push(`Rows ${rowNums.join(", ")}: invalid due_date format — skipped.`);
      continue;
    }

    const gstPercent = parseFloat(first["gst_percent"] ?? "") || 18;
    const notes      = first["notes"] ?? "";
    const clientName = first["client_name"] || email; // Fall back to email if name is blank

    // Parse each row as a line item
    const items: ParsedItem[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r    = rows[i];
      const desc = (r["item_description"] ?? "").trim();
      const qty  = parseFloat(r["item_quantity"] ?? "");
      const rate = parseFloat(r["item_rate"] ?? "");

      if (!desc)                           { errors.push(`Row ${rowNums[i]}: missing item_description — skipped.`); continue; }
      if (!isFinite(qty) || qty <= 0)      { errors.push(`Row ${rowNums[i]}: invalid item_quantity — skipped.`);    continue; }
      if (!isFinite(rate) || rate < 0)     { errors.push(`Row ${rowNums[i]}: invalid item_rate — skipped.`);        continue; }

      items.push({ description: desc, quantity: qty, rate });
    }

    if (!items.length) {
      errors.push(`Invoice for ${email} (due ${dueDate}): no valid line items — skipped.`);
      continue;
    }

    invoices.push({
      clientName,
      clientEmail: email,
      dueDate,
      gstPercent,
      notes,
      items,
      _rowHint: `Row ${rowNums[0]}`,
    });
  }

  return { invoices, errors };
}

// ────────────────────────────────────────────────────────────────────────────
// PDF parser
// ────────────────────────────────────────────────────────────────────────────

/**
 * Extracts invoice data from a text-based PDF using heuristics.
 * This is best-effort — complex or image-only PDFs will not parse well.
 * The user can edit all extracted fields in the preview step before importing.
 *
 * @param buffer Raw PDF bytes
 * @returns      A single ParsedInvoice (PDFs are treated as one invoice per file)
 *               plus any warnings about fields that could not be found
 */
export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  // Use the internal path to skip the test-fixture require() that pdf-parse
  // normally runs at module load time (causes a build error in Next.js)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
    buf: Buffer
  ) => Promise<{ text: string }>;
  const { text } = await pdfParse(buffer);

  const errors: string[] = [];

  // ── Client email — required; abort if not found ──────────────────────
  const emailMatch = text.match(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/);
  if (!emailMatch) {
    return { invoices: [], errors: ["Could not find a client email address in the PDF."] };
  }
  const clientEmail = emailMatch[1].toLowerCase();

  // ── Client name — look for labelled lines near "client", "bill to" etc. ─
  const clientName = extractLabelledValue(text, ["client", "bill to", "billed to", "customer"]) || clientEmail;

  // ── Due date — try labelled lines first, then any date pattern ──────
  const dueDateRaw = extractLabelledValue(text, ["due date", "due", "payment due", "due by"]) || findDateInText(text);
  const dueDate    = dueDateRaw ? normaliseDateString(dueDateRaw) : null;
  if (!dueDate) {
    errors.push("Could not determine due date — defaulting to 30 days from today.");
  }

  // ── GST% — look for "GST XX%" or "Tax XX%" patterns ─────────────────
  const gstMatch   = text.match(/\bGST\b[^\d]*(\d+(?:\.\d+)?)\s*%/i)
                  || text.match(/\bTax\b[^\d]*(\d+(?:\.\d+)?)\s*%/i);
  const gstPercent = gstMatch ? parseFloat(gstMatch[1]) : 18;

  // ── Notes — check common label variants ─────────────────────────────
  const notes = extractLabelledValue(text, ["notes", "remarks", "memo", "description"]) || "";

  // ── Line items — scan for lines that look like: description qty rate ─
  const itemLines = extractLineItems(text);
  if (!itemLines.length) {
    errors.push("Could not parse line items from the PDF. Please add them manually after import.");
    // Insert a placeholder item so the invoice is not empty
    itemLines.push({ description: "Imported from PDF (edit description)", quantity: 1, rate: 0 });
  }

  // Default due date: 30 days from today
  const fallbackDue = new Date();
  fallbackDue.setDate(fallbackDue.getDate() + 30);

  return {
    invoices: [{
      clientName,
      clientEmail,
      dueDate:    dueDate || toYMD(fallbackDue),
      gstPercent,
      notes,
      items:      itemLines,
      _rowHint:   "PDF",
    }],
    errors,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Converts various date formats to YYYY-MM-DD.
 * Accepts: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, or natural language (15 Jan 2025).
 * Returns null if the string cannot be parsed.
 */
function normaliseDateString(raw: string): string | null {
  if (!raw) return null;

  // Already in the target format
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // DD/MM/YYYY or DD-MM-YYYY (most common in India)
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // Try JavaScript's built-in parser for everything else (e.g. "15 Jan 2025")
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return toYMD(d);

  return null;
}

// Formats a Date as YYYY-MM-DD
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Searches the text for a line that contains one of the given labels
 * followed by a colon or dash, and returns the value on that line.
 * Example: "Due Date: 30 Jun 2025" with label "due date" → "30 Jun 2025"
 */
function extractLabelledValue(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)[^\\n]*${label}[^\\n]*?[:\\-]\\s*([^\\n]{1,80})`, "i");
    const m  = text.match(re);
    if (m) {
      const val = m[1].trim();
      if (val.length > 0 && val.length < 80) return val;
    }
  }
  return null;
}

/**
 * Scans the text for any recognisable date string.
 * Returns the first match found, or null if none.
 */
function findDateInText(text: string): string | null {
  const patterns = [
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/,
    /\b(\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

/**
 * Heuristically extracts line items from PDF text.
 * Looks for lines matching the pattern: <description> <qty> <rate> [<amount>]
 * Skips header-like rows (Description, Amount, Total, etc.).
 */
function extractLineItems(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];

  // Match: "Some description text   2   1000.00  2000.00" (last column optional)
  const lineRe = /^(.{3,60}?)\s+(\d+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s*(?:[\d,]+(?:\.\d+)?)?\s*$/gm;

  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(text)) !== null) {
    // Strip leading index numbers like "1." or "1)"
    const desc = m[1].trim().replace(/^\d+[.)]\s*/, "");
    const qty  = parseFloat(m[2]);
    const rate = parseFloat(m[3].replace(/,/g, "")); // Remove thousands separators

    if (desc.length < 3 || qty <= 0 || rate < 0) continue;

    // Skip table header rows that match common column names
    if (/description|item|quantity|rate|amount|total|subtotal|gst|tax/i.test(desc)) continue;

    items.push({ description: desc, quantity: qty, rate });
  }

  return items;
}
