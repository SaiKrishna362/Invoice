// ============================================
// app/api/invoices/route.ts
//
// GET  /api/invoices → returns all invoices for logged-in user
// POST /api/invoices → creates a new invoice with line items
//
// Both routes are protected — user must be logged in.
// ============================================

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateInvoiceNo, calculateGST } from "@/lib/utils";

// ============================================
// GET — List all invoices
// ============================================
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = await db.invoice.findMany({
      where:   { userId: session.user.id },
      include: {
        client: true, // Include client details (name, email etc.)
        items:  true, // Include line items on each invoice
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);

  } catch (err) {
    console.error("[GET INVOICES ERROR]", err);
    return NextResponse.json({ error: "Failed to fetch invoices." }, { status: 500 });
  }
}

// ============================================
// POST — Create a new invoice
//
// Expected body:
// {
//   clientId:   string,
//   dueDate:    string (ISO date e.g. "2024-04-30"),
//   gstPercent: number (default 18),
//   notes:      string (optional),
//   items: [
//     { description: string, quantity: number, rate: number }
//   ]
// }
// ============================================
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, dueDate, gstPercent = 18, notes, items } = await req.json();

    // ---- VALIDATE ----
    if (!clientId || !dueDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Client, due date, and at least one item are required." },
        { status: 400 }
      );
    }

    // Verify the client belongs to the current user (prevent IDOR)
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client || client.userId !== session.user.id) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    // ---- CALCULATE TOTALS ----
    // Line item type definition
    type ItemInput = { description: string; quantity: number; rate: number };

    // Sum up all line item amounts to get subtotal
    const subtotal = items.reduce(
      (sum: number, item: ItemInput) => sum + item.quantity * item.rate,
      0
    );

    // Calculate GST and final total using our utility function
    const { gstAmount, total } = calculateGST(subtotal, gstPercent);

    // ---- GENERATE INVOICE NUMBER ----
    // crypto-random + date prefix — no DB query, no race condition possible
    const invoiceNo = generateInvoiceNo(); // e.g. "INV-202505-3A7F2B91"

    // ---- CREATE INVOICE + ITEMS IN ONE DB CALL ----
    // Prisma lets us create the invoice and all its items together
    const invoice = await db.invoice.create({
      data: {
        invoiceNo,
        dueDate:    new Date(dueDate),
        gstPercent,
        subtotal,
        gstAmount,
        total,
        notes:      notes || null,
        userId:     session.user.id,
        clientId,
        // Create all line items linked to this invoice
        items: {
          create: items.map((item: ItemInput) => ({
            description: item.description,
            quantity:    item.quantity,
            rate:        item.rate,
            amount:      item.quantity * item.rate, // Pre-calculate for convenience
          })),
        },
      },
      include: { client: true, items: true }, // Return the full invoice in response
    });

    return NextResponse.json(invoice, { status: 201 });

  } catch (err) {
    console.error("[CREATE INVOICE ERROR]", err);
    return NextResponse.json({ error: "Failed to create invoice." }, { status: 500 });
  }
}
