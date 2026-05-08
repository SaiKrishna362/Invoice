// ============================================================
// app/api/invoices/[id]/pdf/route.ts — Invoice PDF Download
//
// GET /api/invoices/:id/pdf
//
// Generates and streams a PDF for the given invoice.
// The browser opens this URL directly (via <a href=...>) so
// the response uses Content-Disposition: attachment to trigger
// a file download named after the invoice number.
//
// Security: verifies session ownership before generating the PDF
//           so users cannot download each other's invoices.
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/pdf";
import { NextRequest, NextResponse } from "next/server";

/**
 * Streams the invoice PDF as an attachment download.
 * Returns 401 if not authenticated, 404 if invoice not found,
 * 403 if the invoice belongs to a different user.
 *
 * @param params.id  Invoice database ID from the URL segment
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await db.invoice.findUnique({
    where:   { id },
    include: { user: true, client: true, items: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (invoice.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateInvoicePDF(invoice);
  } catch (err) {
    console.error("[PDF] Generation failed:", err);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }

  // RFC 5987-safe Content-Disposition:
  //   filename=  — ASCII fallback for older clients (special chars replaced with _)
  //   filename*= — UTF-8 encoded value for modern clients (e.g. invoice numbers
  //                with spaces or non-ASCII characters render correctly)
  const asciiName    = invoice.invoiceNo.replace(/[^\x20-\x7E]/g, "_");
  const encodedName  = encodeURIComponent(`${invoice.invoiceNo}.pdf`);
  const disposition  = `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${encodedName}`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
