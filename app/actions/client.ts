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
import { isValidEmail }   from "@/lib/otp";

// Field length limits
const MAX_NAME    = 100;
const MAX_EMAIL   = 254;
const MAX_PHONE   = 20;
const MAX_GSTIN   = 15;
const MAX_ADDRESS = 500;

// Indian GSTIN: 15-character alphanumeric format
// Pattern: 2-digit state code + 10-char PAN + 1 digit + Z + 1 checksum
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function validateClientFields(name: string, email: string, gstin?: string) {
  if (!name)                      return "Name is required.";
  if (name.length > MAX_NAME)     return "Name must be under 100 characters.";
  if (!email)                     return "Email is required.";
  if (email.length > MAX_EMAIL)   return "Email is too long.";
  if (!isValidEmail(email))       return "Please enter a valid email address.";
  if (gstin && gstin.length > MAX_GSTIN) return "GSTIN must be 15 characters.";
  if (gstin && !GSTIN_RE.test(gstin))    return "Please enter a valid GSTIN (e.g. 27AAAPL1234C1Z5).";
  return null;
}

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
  const gstin   = (formData.get("gstin")   as string)?.trim().toUpperCase();
  const address = (formData.get("address") as string)?.trim();

  const validationError = validateClientFields(name, email, gstin || undefined);
  if (validationError) return { error: validationError, success: false };

  if (phone && phone.length > MAX_PHONE)     return { error: "Phone number is too long.",  success: false };
  if (address && address.length > MAX_ADDRESS) return { error: "Address is too long.",     success: false };

  try {
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
  } catch {
    return { error: "Failed to create client. Please try again.", success: false };
  }

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
  const gstin   = (formData.get("gstin")   as string)?.trim().toUpperCase();
  const address = (formData.get("address") as string)?.trim();

  const validationError = validateClientFields(name, email, gstin || undefined);
  if (validationError) return { error: validationError, success: false };

  if (phone && phone.length > MAX_PHONE)       return { error: "Phone number is too long.",  success: false };
  if (address && address.length > MAX_ADDRESS) return { error: "Address is too long.",        success: false };

  // Check the client exists and belongs to the current user
  const existing = await db.client.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id)
    return { error: "Client not found.", success: false };

  try {
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
  } catch {
    return { error: "Failed to update client. Please try again.", success: false };
  }

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

  try {
    await db.client.delete({ where: { id } });
  } catch {
    return { error: "Failed to delete client. Please try again.", success: false };
  }

  revalidatePath("/clients");
  return { error: "", success: true };
}
