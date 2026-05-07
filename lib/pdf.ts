// ============================================================
// lib/pdf.ts — Invoice PDF Generator
//
// Generates a professional A4 PDF for a given invoice using
// the pdf-lib library (pure JS, no external binaries needed).
//
// The PDF includes:
//   - Green header bar with invoice number and date
//   - "From" (freelancer) and "To" (client) address blocks
//   - Line items table with qty, rate, and amount columns
//   - Subtotal, GST, and total summary
//   - Optional notes section
//   - Footer branding
//
// Called by:
//   - app/api/invoices/[id]/pdf/route.ts  → download endpoint
//   - app/actions/invoice.ts              → email attachment
// ============================================================

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Shape of the invoice data expected by this generator
interface InvoiceForPDF {
  invoiceNo:  string;
  dueDate:    Date;
  createdAt:  Date;
  notes:      string | null;
  gstPercent: number;
  subtotal:   number;
  gstAmount:  number;
  total:      number;
  user: {
    name:    string;
    email:   string;
    phone:   string | null;
    gstin:   string | null;
    address: string | null;
  };
  client: {
    name:    string;
    email:   string;
    phone:   string | null;
    gstin:   string | null;
    address: string | null;
  };
  items: {
    description: string;
    quantity:    number;
    rate:        number;
    amount:      number;
  }[];
}

// Brand and neutral colour palette (rgb values 0–1)
const GREEN = rgb(0.102, 0.42, 0.29);   // #1a6b4a — primary brand green
const DARK  = rgb(0.102, 0.102, 0.102); // #1a1a1a — main text
const GRAY  = rgb(0.42, 0.42, 0.42);    // #6b6b6b — secondary text
const LINE  = rgb(0.88, 0.87, 0.84);    // #e0ddd6 — divider / rule colour
const WHITE = rgb(1, 1, 1);

// Formats a number as Indian-style currency string: "Rs. 1,23,456.00"
function amtStr(n: number) {
  return "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Truncates text so it fits within maxWidth pixels at the given font size.
 * Appends "…" when truncation occurs.
 */
function truncate(text: string, maxWidth: number, font: import("pdf-lib").PDFFont, size: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && font.widthOfTextAtSize(t + "…", size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

/**
 * Draws a labelled address block (FROM or TO) on the page.
 * Renders: label → name → address lines → phone → email → GSTIN
 *
 * @returns The Y coordinate after the last line drawn (so callers can continue below)
 */
function drawAddressBlock(
  page:      import("pdf-lib").PDFPage,
  label:     string,                    // "FROM" or "TO"
  entity:    { name: string; email: string; phone: string | null; gstin: string | null; address: string | null },
  x:         number,
  startY:    number,
  font:      import("pdf-lib").PDFFont,
  boldFont:  import("pdf-lib").PDFFont,
  colWidth:  number                     // max pixel width for text truncation
): number {
  let y = startY;

  // Section label in green caps (e.g. "FROM")
  page.drawText(label, { x, y, size: 7, font: boldFont, color: GREEN });
  y -= 14;

  // Entity name — bold, larger
  page.drawText(truncate(entity.name, colWidth, boldFont, 10), { x, y, size: 10, font: boldFont, color: DARK });
  y -= 13;

  // Address — up to 3 lines
  if (entity.address) {
    for (const line of entity.address.split("\n").slice(0, 3)) {
      page.drawText(truncate(line.trim(), colWidth, font, 8), { x, y, size: 8, font, color: GRAY });
      y -= 11;
    }
  }

  if (entity.phone) {
    page.drawText(truncate(entity.phone, colWidth, font, 8), { x, y, size: 8, font, color: GRAY });
    y -= 11;
  }

  page.drawText(truncate(entity.email, colWidth, font, 8), { x, y, size: 8, font, color: GRAY });
  y -= 11;

  // GSTIN appears in bold if present
  if (entity.gstin) {
    page.drawText(`GSTIN: ${entity.gstin}`, { x, y, size: 8, font: boldFont, color: GRAY });
    y -= 11;
  }

  return y;
}

/**
 * Builds a complete PDF for the given invoice and returns the raw bytes.
 * The caller can stream the bytes directly as a response or attach them to an email.
 */
export async function generateInvoicePDF(invoice: InvoiceForPDF): Promise<Uint8Array> {
  const pdfDoc   = await PDFDocument.create();
  const page     = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const M = 48; // page margin in points

  // ── Green header bar ──────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 72, width, height: 72, color: GREEN });

  // "INVOICE" title on the left
  page.drawText("INVOICE", { x: M, y: height - 46, size: 24, font: boldFont, color: WHITE });

  // Invoice number on the right, right-aligned
  page.drawText(invoice.invoiceNo, {
    x:    width - M - boldFont.widthOfTextAtSize(invoice.invoiceNo, 13),
    y:    height - 38,
    size: 13,
    font: boldFont,
    color: WHITE,
  });

  // Creation date below the invoice number
  const dateLabel = `Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}`;
  page.drawText(dateLabel, {
    x:    width - M - font.widthOfTextAtSize(dateLabel, 8),
    y:    height - 54,
    size: 8,
    font,
    color: rgb(0.8, 0.95, 0.87),
  });

  // ── From / To address blocks side by side ────────────────────────────
  const colW  = (width - 2 * M - 30) / 2;  // half-page column width
  const fromY = drawAddressBlock(page, "FROM", invoice.user,   M,              height - 90, font, boldFont, colW);
  const toY   = drawAddressBlock(page, "TO",   invoice.client, M + colW + 30,  height - 90, font, boldFont, colW);

  // Start the rest of the page below whichever block was taller
  let y = Math.min(fromY, toY) - 16;

  // ── Due date row ──────────────────────────────────────────────────────
  page.drawLine({ start: { x: M, y: y + 4 }, end: { x: width - M, y: y + 4 }, thickness: 0.5, color: LINE });
  y -= 10;
  const dueLabel = `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`;
  page.drawText(dueLabel, { x: M, y, size: 8, font: boldFont, color: GRAY });
  y -= 18;

  // ── Line items table ──────────────────────────────────────────────────
  // Column X positions
  const colDesc = M;
  const colQty  = width - M - 250;
  const colRate = width - M - 170;
  const colAmt  = width - M - 80;

  // Table header — green background
  page.drawRectangle({ x: M, y: y - 4, width: width - 2 * M, height: 20, color: GREEN });
  page.drawText("Description", { x: colDesc + 4, y, size: 8, font: boldFont, color: WHITE });
  page.drawText("Qty",          { x: colQty,      y, size: 8, font: boldFont, color: WHITE });
  page.drawText("Rate",         { x: colRate,     y, size: 8, font: boldFont, color: WHITE });
  page.drawText("Amount",       { x: colAmt,      y, size: 8, font: boldFont, color: WHITE });
  y -= 20;

  // One row per line item
  for (const item of invoice.items) {
    page.drawText(truncate(item.description, colQty - colDesc - 8, font, 9), { x: colDesc + 4, y, size: 9, font, color: DARK });
    page.drawText(String(item.quantity), { x: colQty,  y, size: 9, font, color: DARK });
    page.drawText(amtStr(item.rate),     { x: colRate, y, size: 9, font, color: DARK });
    page.drawText(amtStr(item.amount),   { x: colAmt,  y, size: 9, font, color: DARK });
    y -= 4;
    // Thin divider between rows
    page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.4, color: LINE });
    y -= 13;
  }

  y -= 6;

  // ── Totals section (right-aligned) ────────────────────────────────────
  const totLabelX = width - M - 200;
  const totValX   = width - M - 5;

  // Helper to draw one row of the totals block
  const drawTotRow = (label: string, val: string, bold = false, green = false) => {
    const f  = bold  ? boldFont : font;
    const c  = green ? GREEN : bold ? DARK : GRAY;
    const sz = bold  ? 11 : 9;
    page.drawText(label, { x: totLabelX, y, size: sz, font: f, color: c });
    const valW = f.widthOfTextAtSize(val, sz);
    page.drawText(val, { x: totValX - valW, y, size: sz, font: f, color: c });
    y -= bold ? 18 : 14;
  };

  drawTotRow("Subtotal",                    amtStr(invoice.subtotal));
  drawTotRow(`GST @ ${invoice.gstPercent}%`, amtStr(invoice.gstAmount));
  // Divider before the total
  page.drawLine({ start: { x: totLabelX, y: y + 4 }, end: { x: width - M, y: y + 4 }, thickness: 0.5, color: LINE });
  y -= 4;
  drawTotRow("Total", amtStr(invoice.total), true, true); // bold green for the final total

  // ── Notes (optional) ─────────────────────────────────────────────────
  if (invoice.notes) {
    y -= 8;
    page.drawText("Notes", { x: M, y, size: 8, font: boldFont, color: GREEN });
    y -= 13;

    // Wrap notes text to fit within the page margins
    const words = invoice.notes.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(test, 8) > width - 2 * M) {
        page.drawText(line, { x: M, y, size: 8, font, color: GRAY });
        y -= 11;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: M, y, size: 8, font, color: GRAY });
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: M, y: 40 }, end: { x: width - M, y: 40 }, thickness: 0.4, color: LINE });
  page.drawText("Generated by tulluri.in", { x: M, y: 26, size: 7, font, color: LINE });

  // Serialise and return raw PDF bytes
  return pdfDoc.save();
}
