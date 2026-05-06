"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateInvoicePDF } from "@/lib/pdf";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function createInvoiceAction(
  _prev: { error: string; success: boolean; invoiceId?: string } | null,
  formData: FormData
): Promise<{ error: string; success: boolean; invoiceId?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const clientId   = formData.get("clientId")   as string;
  const dueDate    = formData.get("dueDate")    as string;
  const gstPercent = parseFloat(formData.get("gstPercent") as string) || 18;
  const notes      = (formData.get("notes") as string)?.trim() || null;

  const descriptions = formData.getAll("itemDescription") as string[];
  const quantities   = formData.getAll("itemQuantity")    as string[];
  const rates        = formData.getAll("itemRate")        as string[];

  if (!clientId) return { error: "Client is required.",   success: false };
  if (!dueDate)  return { error: "Due date is required.", success: false };

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client || client.userId !== session.user.id)
    return { error: "Client not found.", success: false };

  const items = descriptions
    .map((desc, i) => {
      const qty  = parseFloat(quantities[i]) || 0;
      const rate = parseFloat(rates[i])      || 0;
      return { description: desc.trim(), quantity: qty, rate, amount: qty * rate };
    })
    .filter((it) => it.description && it.amount > 0);

  if (!items.length) return { error: "Add at least one valid line item.", success: false };

  const subtotal  = items.reduce((s, it) => s + it.amount, 0);
  const gstAmount = Math.round(subtotal * (gstPercent / 100) * 100) / 100;
  const total     = Math.round((subtotal + gstAmount) * 100) / 100;

  const count     = await db.invoice.count({ where: { userId: session.user.id } });
  const invoiceNo = `INV-${String(count + 1).padStart(3, "0")}`;

  const invoice = await db.invoice.create({
    data: {
      invoiceNo,
      clientId,
      userId: session.user.id,
      dueDate: new Date(dueDate),
      gstPercent,
      subtotal,
      gstAmount,
      total,
      notes,
      items: { create: items },
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { error: "", success: true, invoiceId: invoice.id };
}

export async function updateInvoiceStatusAction(
  id: string,
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE"
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.userId !== session.user.id) return;

  await db.invoice.update({ where: { id }, data: { status } });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function deleteInvoiceAction(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.userId !== session.user.id) return;

  await db.invoiceItem.deleteMany({ where: { invoiceId: id } });
  await db.invoice.delete({ where: { id } });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}

export async function sendInvoiceAction(
  id: string
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const invoice = await db.invoice.findUnique({
    where:   { id },
    include: { user: true, client: true, items: true },
  });

  if (!invoice || invoice.userId !== session.user.id)
    return { error: "Invoice not found.", success: false };

  try {
    const pdfBytes = await generateInvoicePDF(invoice);

    const totalFormatted = `Rs. ${invoice.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const dueDateFormatted = new Date(invoice.dueDate).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });

    const notesRow = invoice.notes
      ? `<tr><td style="padding:8px 0;color:#6b6b6b;font-size:13px;border-top:1px solid #e0ddd6">Notes</td><td style="text-align:right;color:#1a1a1a;font-size:13px;padding:8px 0;border-top:1px solid #e0ddd6">${escapeHtml(invoice.notes)}</td></tr>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${escapeHtml(invoice.invoiceNo)}</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px">
      <table width="100%" style="max-width:580px" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr><td style="background:#1a6b4a;border-radius:12px 12px 0 0;padding:32px 36px">
          <p style="margin:0;color:#a7d9c0;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">Invoice</p>
          <h1 style="margin:4px 0 0;color:#ffffff;font-size:26px;font-weight:700">${escapeHtml(invoice.invoiceNo)}</h1>
          <p style="margin:6px 0 0;color:#c8ead8;font-size:14px">From ${escapeHtml(invoice.user.name)}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px 36px">
          <p style="margin:0 0 6px;color:#1a1a1a;font-size:15px">Hi ${escapeHtml(invoice.client.name)},</p>
          <p style="margin:0 0 24px;color:#6b6b6b;font-size:14px;line-height:1.6">
            Please find your invoice attached. Here&rsquo;s a summary of what&rsquo;s due.
          </p>

          <!-- Summary box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f6;border-radius:10px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#6b6b6b;font-size:13px;padding-bottom:10px">Invoice Number</td>
                  <td style="text-align:right;color:#1a1a1a;font-size:13px;font-weight:600;padding-bottom:10px">${escapeHtml(invoice.invoiceNo)}</td>
                </tr>
                <tr>
                  <td style="color:#6b6b6b;font-size:13px;padding-bottom:10px">Due Date</td>
                  <td style="text-align:right;color:#1a1a1a;font-size:13px;font-weight:600;padding-bottom:10px">${dueDateFormatted}</td>
                </tr>
                ${notesRow}
                <tr>
                  <td style="color:#1a1a1a;font-size:14px;font-weight:700;border-top:1px solid #e0ddd6;padding-top:12px">Total Due</td>
                  <td style="text-align:right;color:#1a6b4a;font-size:20px;font-weight:700;border-top:1px solid #e0ddd6;padding-top:12px">${totalFormatted}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 6px;color:#555;font-size:14px">The full invoice PDF is attached to this email.</p>
          <p style="margin:0;color:#555;font-size:14px">Thank you for your business!</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f8f6;border-top:1px solid #e0ddd6;border-radius:0 0 12px 12px;padding:18px 36px">
          <p style="margin:0;color:#aaa;font-size:12px;text-align:center">
            Sent by ${escapeHtml(invoice.user.name)} &middot; Powered by Tulluri
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const { error: sendError } = await resend.emails.send({
      from:     `${invoice.user.name} <${process.env.RESEND_FROM_EMAIL}>`,
      replyTo:  invoice.user.email,
      to:       invoice.client.email,
      subject:  `Invoice ${invoice.invoiceNo} from ${escapeHtml(invoice.user.name)} – ${totalFormatted}`,
      html,
      attachments: [
        {
          filename: `${invoice.invoiceNo}.pdf`,
          content:  Buffer.from(pdfBytes),
        },
      ],
    });

    if (sendError) {
      console.error("sendInvoiceAction resend error:", sendError);
      return {
        error: (sendError as { message?: string }).message ?? "Failed to send email.",
        success: false,
      };
    }

    await db.invoice.update({ where: { id }, data: { status: "SENT" } });
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/invoices");
    return { error: "", success: true };
  } catch (err) {
    console.error("sendInvoiceAction:", err);
    return { error: "Failed to send email. Please check your Resend API key.", success: false };
  }
}
