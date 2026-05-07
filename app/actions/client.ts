// ============================================================
// app/actions/client.ts — Client CRUD Server Actions
//
// Server actions for creating, updating, and deleting clients.
// All actions verify the user's session and enforce ownership
// (a user can only manage their own clients).
//
// Used by: app/(app)/clients/ClientsManager.tsx
// ============================================================

"use server";

import { auth }           from "@/auth";
import { db }             from "@/lib/db";
import { revalidatePath } from "next/cache";

// ────────────────────────────────────────────────────────────────────────────
// Create
// ────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new client and links it to the logged-in user.
 * Called from the "Add Client" modal form via useActionState.
 */
export async function createClientAction(
  _prev: { error: string; success: boolean } | null,
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  // Extract and sanitise form fields
  const name    = (formData.get("name")    as string)?.trim();
  const email   = (formData.get("email")   as string)?.toLowerCase().trim();
  const phone   = (formData.get("phone")   as string)?.trim();
  const gstin   = (formData.get("gstin")   as string)?.trim();
  const address = (formData.get("address") as string)?.trim();

  if (!name)  return { error: "Name is required.",  success: false };
  if (!email) return { error: "Email is required.", success: false };

  await db.client.create({
    data: {
      name,
      email,
      phone:   phone   || null,
      gstin:   gstin   || null,
      address: address || null,
      userId:  session.user.id, // Link client to the current user
    },
  });

  // Invalidate the /clients page cache so the new client appears immediately
  revalidatePath("/clients");
  return { error: "", success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Update
// ────────────────────────────────────────────────────────────────────────────

/**
 * Updates an existing client's details.
 * Verifies ownership before making any changes (IDOR prevention).
 * Called from the "Edit Client" modal form via useActionState.
 */
export async function updateClientAction(
  _prev: { error: string; success: boolean } | null,
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const id      = formData.get("id")      as string;
  const name    = (formData.get("name")    as string)?.trim();
  const email   = (formData.get("email")   as string)?.toLowerCase().trim();
  const phone   = (formData.get("phone")   as string)?.trim();
  const gstin   = (formData.get("gstin")   as string)?.trim();
  const address = (formData.get("address") as string)?.trim();

  if (!name)  return { error: "Name is required.",  success: false };
  if (!email) return { error: "Email is required.", success: false };

  // Check the client exists and belongs to the current user
  const existing = await db.client.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id)
    return { error: "Client not found.", success: false };

  await db.client.update({
    where: { id },
    data: {
      name,
      email,
      phone:   phone   || null,
      gstin:   gstin   || null,
      address: address || null,
    },
  });

  revalidatePath("/clients");
  return { error: "", success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Delete
// ────────────────────────────────────────────────────────────────────────────

/**
 * Deletes a client record.
 * Refuses if the client has any associated invoices — those must be
 * deleted first to maintain referential integrity.
 * Verifies ownership before deleting.
 */
export async function deleteClientAction(id: string): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  // Load the client with a count of attached invoices
  const existing = await db.client.findUnique({
    where:   { id },
    include: { _count: { select: { invoices: true } } },
  });

  if (!existing || existing.userId !== session.user.id)
    return { error: "Client not found.", success: false };

  // Block deletion if this client has invoices — prevents broken FK references
  if (existing._count.invoices > 0)
    return { error: "Cannot delete a client with existing invoices.", success: false };

  await db.client.delete({ where: { id } });
  revalidatePath("/clients");
  return { error: "", success: true };
}
