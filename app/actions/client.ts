"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createClientAction(
  _prev: { error: string; success: boolean } | null,
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

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
      userId:  session.user.id,
    },
  });

  revalidatePath("/clients");
  return { error: "", success: true };
}

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

export async function deleteClientAction(id: string): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const existing = await db.client.findUnique({
    where:   { id },
    include: { _count: { select: { invoices: true } } },
  });
  if (!existing || existing.userId !== session.user.id)
    return { error: "Client not found.", success: false };

  if (existing._count.invoices > 0)
    return { error: "Cannot delete a client with existing invoices.", success: false };

  await db.client.delete({ where: { id } });
  revalidatePath("/clients");
  return { error: "", success: true };
}
