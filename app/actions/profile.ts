"use server";

import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { Resend } from "resend";
import { verifyEmailOtp, verifyPhoneOtp, isValidOtpFormat, isValidEmail } from "@/lib/otp";

// Input length limits
const MAX_NAME    = 100;
const MAX_EMAIL   = 254;
const MAX_PHONE   = 20;
const MAX_GSTIN   = 15;
const MAX_ADDRESS = 500;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

async function sendEmailOtp(
  to: string,
  otp: string,
  subject: string,
  heading: string,
  body: string,
  headingColor = "#1a6b4a"
): Promise<string | null> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from:    `Tulluri <${process.env.RESEND_FROM_EMAIL}>`,
    to,
    subject,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">
        <tr><td style="background:${headingColor};border-radius:12px 12px 0 0;padding:28px 36px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${escapeHtml(heading)}</h1>
          <p style="margin:4px 0 0;color:#c8ead8;font-size:13px">Tulluri Invoice Manager</p>
        </td></tr>
        <tr><td style="background:#fff;padding:32px 36px">
          ${body}
          <div style="background:#f9f8f6;border-radius:10px;padding:24px;text-align:center;margin:24px 0">
            <p style="margin:0 0 8px;color:#6b6b6b;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:600">Verification code</p>
            <p style="margin:0;color:${headingColor};font-size:40px;font-weight:700;letter-spacing:10px">${otp}</p>
          </div>
          <p style="margin:0;color:#aaa;font-size:13px">If you didn&rsquo;t request this, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="background:#f9f8f6;border-top:1px solid #e0ddd6;border-radius:0 0 12px 12px;padding:16px 36px">
          <p style="margin:0;color:#aaa;font-size:12px;text-align:center">Tulluri Invoice Manager</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
  return error ? (error as { message?: string }).message ?? "Failed to send email." : null;
}

// ---- UPDATE PROFILE (name, GSTIN, address) ----
export async function updateProfileAction(
  _prev: { error: string; success: boolean } | null,
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const name    = (formData.get("name")    as string)?.trim();
  const gstin   = (formData.get("gstin")   as string)?.trim();
  const address = (formData.get("address") as string)?.trim();

  if (!name)                   return { error: "Name is required.", success: false };
  if (name.length > MAX_NAME)  return { error: "Name is too long (max 100 characters).", success: false };
  if (gstin && gstin.length > MAX_GSTIN)   return { error: "GSTIN is too long.", success: false };
  if (address && address.length > MAX_ADDRESS) return { error: "Address is too long (max 500 characters).", success: false };

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name,
      gstin:   gstin   || null,
      address: address || null,
    },
  });

  revalidatePath("/profile");
  return { error: "", success: true };
}

// ============================================================
// EMAIL CHANGE
// ============================================================

export async function sendEmailChangeOtpAction(
  newEmail: string
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const normalizedEmail = newEmail.toLowerCase().trim();
  if (!normalizedEmail)                    return { error: "Email is required.", success: false };
  if (normalizedEmail.length > MAX_EMAIL)  return { error: "Invalid email.", success: false };
  if (!isValidEmail(normalizedEmail))      return { error: "Invalid email format.", success: false };

  const current = await db.user.findUnique({ where: { id: session.user.id } });
  if (!current) return { error: "Unauthorized", success: false };

  if (current.email === normalizedEmail)
    return { error: "This is already your email address.", success: false };

  const taken = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (taken) return { error: "This email is already in use by another account.", success: false };

  await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

  const otp       = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.passwordResetToken.create({ data: { email: normalizedEmail, token: otp, expiresAt } });

  try {
    const err = await sendEmailOtp(
      normalizedEmail,
      otp,
      `${otp} is your Tulluri email verification code`,
      "Verify your new email",
      `<p style="margin:0 0 4px;color:#1a1a1a;font-size:15px">Hi ${escapeHtml(current.name)},</p>
       <p style="margin:0;color:#6b6b6b;font-size:14px;line-height:1.6">
         Enter this code to confirm your new email address. Expires in <strong>10 minutes</strong>.
       </p>`
    );
    if (err) return { error: err, success: false };
  } catch {
    return { error: "Failed to send email. Please try again.", success: false };
  }

  return { error: "", success: true };
}

export async function updateEmailWithOtpAction(
  newEmail: string,
  otp: string
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const normalizedEmail = newEmail.toLowerCase().trim();
  if (!isValidEmail(normalizedEmail))  return { error: "Invalid email format.", success: false };
  if (!isValidOtpFormat(otp))          return { error: "Invalid code format.", success: false };

  const taken = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (taken && taken.id !== session.user.id)
    return { error: "This email is already in use.", success: false };

  const err = await verifyEmailOtp(normalizedEmail, otp, true);
  if (err) return { error: err, success: false };

  await db.user.update({ where: { id: session.user.id }, data: { email: normalizedEmail } });

  revalidatePath("/profile");
  return { error: "", success: true };
}

// ============================================================
// PHONE CHANGE
// ============================================================

export async function sendPhoneChangeOtpAction(
  newPhone: string
): Promise<{ error: string; success: boolean }> {
  const { sendSmsOtp, normalizePhone, isValidPhone } = await import("@/lib/sms");

  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const normalized = normalizePhone(newPhone);
  if (!normalized)                       return { error: "Phone number is required.", success: false };
  if (normalized.length > MAX_PHONE)     return { error: "Invalid phone number.", success: false };
  if (!isValidPhone(normalized))
    return { error: "Phone must be in E.164 format, e.g. +919876543210.", success: false };

  const current = await db.user.findUnique({ where: { id: session.user.id } });
  if (!current) return { error: "Unauthorized", success: false };

  if (current.phone === normalized)
    return { error: "This is already your phone number.", success: false };

  await db.phoneOtp.deleteMany({ where: { phone: normalized } });

  const otp       = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.phoneOtp.create({ data: { phone: normalized, token: otp, expiresAt } });

  const smsErr = await sendSmsOtp(normalized, otp);
  if (smsErr) {
    await db.phoneOtp.deleteMany({ where: { phone: normalized } });
    return { error: smsErr, success: false };
  }

  return { error: "", success: true };
}

export async function updatePhoneWithOtpAction(
  newPhone: string,
  otp: string
): Promise<{ error: string; success: boolean }> {
  const { normalizePhone, isValidPhone } = await import("@/lib/sms");

  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const normalized = normalizePhone(newPhone);
  if (!isValidPhone(normalized))  return { error: "Invalid phone number.", success: false };
  if (!isValidOtpFormat(otp))     return { error: "Invalid code format.", success: false };

  const err = await verifyPhoneOtp(normalized, otp);
  if (err) return { error: err, success: false };

  await db.user.update({ where: { id: session.user.id }, data: { phone: normalized } });

  revalidatePath("/profile");
  return { error: "", success: true };
}

export async function removePhoneAction(): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  await db.user.update({ where: { id: session.user.id }, data: { phone: null } });
  revalidatePath("/profile");
  return { error: "", success: true };
}

// ============================================================
// DELETE ACCOUNT
// Sends email OTP always. Also sends SMS OTP if user has phone.
// Both are required for deletion when phone is registered.
// ============================================================

export async function sendDeleteOtpAction(): Promise<{
  error: string;
  success: boolean;
  hasPhone: boolean;
}> {
  const { sendSmsOtp } = await import("@/lib/sms");

  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false, hasPhone: false };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Unauthorized", success: false, hasPhone: false };

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // ---- Email OTP ----
  await db.passwordResetToken.deleteMany({ where: { email: user.email } });
  const emailOtp = crypto.randomInt(100000, 1000000).toString();
  await db.passwordResetToken.create({ data: { email: user.email, token: emailOtp, expiresAt } });

  try {
    const err = await sendEmailOtp(
      user.email,
      emailOtp,
      `${emailOtp} – Confirm account deletion`,
      "Account Deletion Request",
      `<p style="margin:0 0 4px;color:#1a1a1a;font-size:15px">Hi ${escapeHtml(user.name)},</p>
       <p style="margin:0;color:#6b6b6b;font-size:14px;line-height:1.6">
         We received a request to permanently delete your Tulluri account and all its data.
         Enter the code below to confirm. Expires in <strong>10 minutes</strong>.
         <br><br><strong>This action cannot be undone.</strong>
       </p>`,
      "#b91c1c"
    );
    if (err) return { error: err, success: false, hasPhone: false };
  } catch {
    return { error: "Failed to send email. Please try again.", success: false, hasPhone: false };
  }

  // ---- Phone OTP (if user has phone) ----
  if (user.phone) {
    await db.phoneOtp.deleteMany({ where: { phone: user.phone } });
    const phoneOtp = crypto.randomInt(100000, 1000000).toString();
    await db.phoneOtp.create({ data: { phone: user.phone, token: phoneOtp, expiresAt } });

    const smsErr = await sendSmsOtp(user.phone, phoneOtp);
    if (smsErr) {
      await db.passwordResetToken.deleteMany({ where: { email: user.email } });
      return { error: smsErr, success: false, hasPhone: false };
    }
  }

  return { error: "", success: true, hasPhone: !!user.phone };
}

export async function deleteAccountAction(
  emailOtp: string,
  phoneOtp?: string
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  if (!isValidOtpFormat(emailOtp)) return { error: "Invalid email code format.", success: false };
  if (phoneOtp && !isValidOtpFormat(phoneOtp))
    return { error: "Invalid phone code format.", success: false };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Unauthorized", success: false };

  // Verify email OTP
  const emailErr = await verifyEmailOtp(user.email, emailOtp, true);
  if (emailErr) return { error: emailErr, success: false };

  // Verify phone OTP if user has phone registered
  if (user.phone) {
    if (!phoneOtp) return { error: "Phone verification code is required.", success: false };
    const phoneErr = await verifyPhoneOtp(user.phone, phoneOtp);
    if (phoneErr) return { error: phoneErr, success: false };
  }

  // Delete all data in dependency order
  const invoiceIds = (
    await db.invoice.findMany({ where: { userId: user.id }, select: { id: true } })
  ).map(inv => inv.id);

  await db.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  await db.invoice.deleteMany({ where: { userId: user.id } });
  await db.client.deleteMany({ where: { userId: user.id } });
  await db.passwordResetToken.deleteMany({ where: { email: user.email } });
  await db.user.delete({ where: { id: user.id } });

  return { error: "", success: true };
}

export async function logoutAfterDeleteAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
