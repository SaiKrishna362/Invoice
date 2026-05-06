import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface InvoiceForPDF {
  invoiceNo: string;
  dueDate: Date;
  createdAt: Date;
  notes: string | null;
  gstPercent: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  user: {
    name: string;
    email: string;
    phone: string | null;
    gstin: string | null;
    address: string | null;
  };
  client: {
    name: string;
    email: string;
    phone: string | null;
    gstin: string | null;
    address: string | null;
  };
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
}

const GREEN = rgb(0.102, 0.42, 0.29);
const DARK  = rgb(0.102, 0.102, 0.102);
const GRAY  = rgb(0.42, 0.42, 0.42);
const LINE  = rgb(0.88, 0.87, 0.84);
const WHITE = rgb(1, 1, 1);

function amtStr(n: number) {
  return "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncate(text: string, maxWidth: number, font: import("pdf-lib").PDFFont, size: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && font.widthOfTextAtSize(t + "…", size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function drawAddressBlock(
  page: import("pdf-lib").PDFPage,
  label: string,
  entity: { name: string; email: string; phone: string | null; gstin: string | null; address: string | null },
  x: number,
  startY: number,
  font: import("pdf-lib").PDFFont,
  boldFont: import("pdf-lib").PDFFont,
  colWidth: number
): number {
  let y = startY;
  page.drawText(label, { x, y, size: 7, font: boldFont, color: GREEN });
  y -= 14;
  page.drawText(truncate(entity.name, colWidth, boldFont, 10), { x, y, size: 10, font: boldFont, color: DARK });
  y -= 13;
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
  if (entity.gstin) {
    page.drawText(`GSTIN: ${entity.gstin}`, { x, y, size: 8, font: boldFont, color: GRAY });
    y -= 11;
  }
  return y;
}

export async function generateInvoicePDF(invoice: InvoiceForPDF): Promise<Uint8Array> {
  const pdfDoc  = await PDFDocument.create();
  const page    = pdfDoc.addPage([595.28, 841.89]); // A4
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const M = 48; // margin

  // ── Header bar ──
  page.drawRectangle({ x: 0, y: height - 72, width, height: 72, color: GREEN });
  page.drawText("INVOICE", { x: M, y: height - 46, size: 24, font: boldFont, color: WHITE });
  page.drawText(invoice.invoiceNo, {
    x: width - M - boldFont.widthOfTextAtSize(invoice.invoiceNo, 13),
    y: height - 38,
    size: 13,
    font: boldFont,
    color: WHITE,
  });
  const dateLabel = `Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}`;
  page.drawText(dateLabel, {
    x: width - M - font.widthOfTextAtSize(dateLabel, 8),
    y: height - 54,
    size: 8,
    font,
    color: rgb(0.8, 0.95, 0.87),
  });

  // ── From / To ──
  const colW = (width - 2 * M - 30) / 2;
  const fromY = drawAddressBlock(page, "FROM", invoice.user,   M,          height - 90, font, boldFont, colW);
  const toY   = drawAddressBlock(page, "TO",   invoice.client, M + colW + 30, height - 90, font, boldFont, colW);

  let y = Math.min(fromY, toY) - 16;

  // ── Due date row ──
  page.drawLine({ start: { x: M, y: y + 4 }, end: { x: width - M, y: y + 4 }, thickness: 0.5, color: LINE });
  y -= 10;
  const dueLabel = `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`;
  page.drawText(dueLabel, { x: M, y, size: 8, font: boldFont, color: GRAY });
  y -= 18;

  // ── Items table ──
  const colDesc  = M;
  const colQty   = width - M - 250;
  const colRate  = width - M - 170;
  const colAmt   = width - M - 80;

  // Header
  page.drawRectangle({ x: M, y: y - 4, width: width - 2 * M, height: 20, color: GREEN });
  page.drawText("Description", { x: colDesc + 4, y,  size: 8, font: boldFont, color: WHITE });
  page.drawText("Qty",          { x: colQty,      y,  size: 8, font: boldFont, color: WHITE });
  page.drawText("Rate",         { x: colRate,     y,  size: 8, font: boldFont, color: WHITE });
  page.drawText("Amount",       { x: colAmt,      y,  size: 8, font: boldFont, color: WHITE });
  y -= 20;

  // Rows
  for (const item of invoice.items) {
    page.drawText(truncate(item.description, colQty - colDesc - 8, font, 9), { x: colDesc + 4, y, size: 9, font, color: DARK });
    page.drawText(String(item.quantity), { x: colQty,  y, size: 9, font, color: DARK });
    page.drawText(amtStr(item.rate),     { x: colRate, y, size: 9, font, color: DARK });
    page.drawText(amtStr(item.amount),   { x: colAmt,  y, size: 9, font, color: DARK });
    y -= 4;
    page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.4, color: LINE });
    y -= 13;
  }

  y -= 6;

  // ── Totals ──
  const totLabelX = width - M - 200;
  const totValX   = width - M - 5;

  const drawTotRow = (label: string, val: string, bold = false, green = false) => {
    const f = bold ? boldFont : font;
    const c = green ? GREEN : bold ? DARK : GRAY;
    const sz = bold ? 11 : 9;
    page.drawText(label, { x: totLabelX, y, size: sz, font: f, color: c });
    const valW = f.widthOfTextAtSize(val, sz);
    page.drawText(val, { x: totValX - valW, y, size: sz, font: f, color: c });
    y -= bold ? 18 : 14;
  };

  drawTotRow("Subtotal", amtStr(invoice.subtotal));
  drawTotRow(`GST @ ${invoice.gstPercent}%`, amtStr(invoice.gstAmount));
  page.drawLine({ start: { x: totLabelX, y: y + 4 }, end: { x: width - M, y: y + 4 }, thickness: 0.5, color: LINE });
  y -= 4;
  drawTotRow("Total", amtStr(invoice.total), true, true);

  // ── Notes ──
  if (invoice.notes) {
    y -= 8;
    page.drawText("Notes", { x: M, y, size: 8, font: boldFont, color: GREEN });
    y -= 13;
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

  // ── Footer ──
  page.drawLine({ start: { x: M, y: 40 }, end: { x: width - M, y: 40 }, thickness: 0.4, color: LINE });
  page.drawText("Generated by tulluri.in", { x: M, y: 26, size: 7, font, color: LINE });

  return pdfDoc.save();
}
