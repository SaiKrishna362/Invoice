// ============================================
// app/api/clients/route.ts
//
// GET  /api/clients → returns all clients for logged-in user
// POST /api/clients → creates a new client
//
// Both routes are protected — user must be logged in.
// ============================================

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// ============================================
// GET — List all clients
// ============================================
export async function GET() {
  try {
    // Check session — reject if not logged in
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch only clients that belong to this user
    const clients = await db.client.findMany({
      where:   { userId: session.user.id },
      orderBy: { name: "asc" }, // Alphabetical order
    });

    return NextResponse.json(clients);

  } catch (err) {
    console.error("[GET CLIENTS ERROR]", err);
    return NextResponse.json({ error: "Failed to fetch clients." }, { status: 500 });
  }
}

// ============================================
// POST — Create a new client
// Expected body: { name, email, phone?, address?, gstin? }
// ============================================
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name    = (body.name    as string)?.trim();
    const email   = (body.email   as string)?.toLowerCase().trim();
    const phone   = (body.phone   as string)?.trim() || null;
    const address = (body.address as string)?.trim() || null;
    const gstin   = (body.gstin   as string)?.trim() || null;

    // name and email are required
    if (!name || !email) {
      return NextResponse.json(
        { error: "Client name and email are required." },
        { status: 400 }
      );
    }

    // Create the client linked to the current user
    const client = await db.client.create({
      data: {
        name,
        email,
        phone,
        address,
        gstin,
        userId: session.user.id,
      },
    });

    return NextResponse.json(client, { status: 201 });

  } catch (err) {
    console.error("[CREATE CLIENT ERROR]", err);
    return NextResponse.json({ error: "Failed to create client." }, { status: 500 });
  }
}
