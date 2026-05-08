// ============================================================
// app/actions/profile.ts — Profile & Account Management Actions
//
// Server actions for everything on the /profile page:
//   updateProfileAction         — update name, GSTIN, address
//   sendEmailChangeOtpAction    — send OTP to a new email address
//   updateEmailWithOtpAction    — verify OTP and commit the new email
//   sendPhoneChangeOtpAction    — send SMS OTP to a new phone number
//   updatePhoneWithOtpAction    — verify OTP and commit the new phone
//   removePhoneAction           — unlink phone without OTP (user-initiated)
//   sendDeleteOtpAction         — send email (+ optional SMS) OTPs for account deletion
//   deleteAccountAction         — verify OTPs then delete all user data in order
//   logoutAfterDeleteAction     — call signOut after a successful deletion
//
// All actions verify the session before touching any data.
// Email and phone changes require OTP verification to prevent takeovers.
// Account deletion requires both email AND phone OTP when a phone is set.
// OTPs are stored as SHA-256 hashes — never as plaintext.
// All DB calls are wrapped in try/catch to handle transient failures gracefully.
// ============================================================

"use server";

import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { Resend } from "resend";
import {
  verifyEmailOtp,
  verifyPhoneOtp,
  isValidOtpFormat,
  isValidEmail,
  hashOtp,
} from "@/lib/otp";

// Input length limits — mirror the DB column constraints
const MAX_NAME    = 100;
const MAX_EMAIL   = 254;
const MAX_PHONE   = 20;
const MAX_GSTIN   = 15;
const MAX_ADDRESS = 500;

/** Escapes special HTML characters to prevent XSS in email bodies. */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Sends a branded OTP email using Resend.
 * Returns null on success, or the error message string on failure.
 */
async function sendEmailOtp(
  to: string,
  otp: string,
  subject: string,
  heading: string,
  body: string,
  headingColor = "#1a6b4a"
): Promise<string | null> {
  try {
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
  } catch {
    return "Failed to send email. Please try again.";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Update profile
// ────────────────────────────────────────────────────────────────────────────

/**
 * Saves the user's name, GSTIN, and address.
 * These three fields appear on every PDF invoice, so they must be kept current.
 * Called from ProfileForm.tsx via useActionState.
 */
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
  if (gstin && gstin.length > MAX_GSTIN)       return { error: "GSTIN is too long.", success: false };
  if (address && address.length > MAX_ADDRESS) return { error: "Address is too long (max 500 characters).", success: false };

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        gstin:   gstin   || null,
        address: address || null,
      },
    });
  } catch {
    return { error: "Failed to save profile. Please try again.", success: false };
  }

  revalidatePath("/profile");
  return { error: "", success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Email change (two-step: send OTP → verify + commit)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Step 1 of the email-change flow.
 * Validates the new address, checks it isn't already taken, then emails
 * a 6-digit OTP to the NEW address stored as a SHA-256 hash.
 */
export async function sendEmailChangeOtpAction(
  newEmail: string
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const normalizedEmail = newEmail.toLowerCase().trim();
  if (!normalizedEmail)                    return { error: "Email is required.", success: false };
  if (normalizedEmail.length > MAX_EMAIL)  return { error: "Invalid email.", success: false };
  if (!isValidEmail(normalizedEmail))      return { error: "Invalid email format.", success: false };

  let current;
  try {
    current = await db.user.findUnique({ where: { id: session.user.id } });
  } catch {
    return { error: "Something went wrong. Please try again.", success: false };
  }
  if (!current) return { error: "Unauthorized", success: false };

  if (current.email === normalizedEmail)
    return { error: "This is already your email address.", success: false };

  let taken;
  try {
    taken = await db.user.findUnique({ where: { email: normalizedEmail } });
  } catch {
    return { error: "Something went wrong. Please try again.", success: false };
  }
  if (taken) return { error: "This email is already in use by another account.", success: false };

  const otp       = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });
    // Store SHA-256 hash — never the raw code
    await db.passwordResetToken.create({ data: { email: normalizedEmail, token: hashOtp(otp), expiresAt } });
  } catch {
    return { error: "Something went wrong. Please try again.", success: false };
  }

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

  return { error: "", success: true };
}

/**
 * Step 2 of the email-change flow.
 * Verifies the OTP and atomically updates the user's email.
 */
export async function updateEmailWithOtpAction(
  newEmail: string,
  otp: string
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  const normalizedEmail = newEmail.toLowerCase().trim();
  if (!isValidEmail(normalizedEmail))  return { error: "Invalid email format.", success: false };
  if (!isValidOtpFormat(otp))          return { error: "Invalid code format.", success: false };

  try {
    const taken = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (taken && taken.id !== session.user.id)
      return { error: "This email is already in use.", success: false };

    const err = await verifyEmailOtp(normalizedEmail, otp, true);
    if (err) return { error: err, success: false };

    await db.user.update({ where: { id: session.user.id }, data: { email: normalizedEmail } });
  } catch {
    return { error: "Failed to update email. Please try again.", success: false };
  }

  revalidatePath("/profile");
  return { error: "", success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Phone change (two-step: send SMS OTP → verify + commit)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Step 1 of the phone-change flow.
 * Validates the number in E.164 format, sends a 6-digit SMS OTP stored as a hash.
 */
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

  let current;
  try {
    current = await db.user.findUnique({ where: { id: session.user.id } });
  } catch {
    return { error: "Something went wrong. Please try again.", success: false };
  }
  if (!current) return { error: "Unauthorized", success: false };

  if (current.phone === normalized)
    return { error: "This is already your phone number.", success: false };

  const otp       = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await db.phoneOtp.deleteMany({ where: { phone: normalized } });
    // Store SHA-256 hash — never the raw code
    await db.phoneOtp.create({ data: { phone: normalized, token: hashOtp(otp), expiresAt } });
  } catch {
    return { error: "Something went wrong. Please try again.", success: false };
  }

  const smsErr = await sendSmsOtp(normalized, otp);
  if (smsErr) {
    await db.phoneOtp.deleteMany({ where: { phone: normalized } }).catch(() => {});
    return { error: smsErr, success: false };
  }

  return { error: "", success: true };
}

/**
 * Step 2 of the phone-change flow.
 * Verifies the SMS OTP and saves the normalised phone number to the user record.
 */
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

  try {
    const err = await verifyPhoneOtp(normalized, otp);
    if (err) return { error: err, success: false };

    await db.user.update({ where: { id: session.user.id }, data: { phone: normalized } });
  } catch {
    return { error: "Failed to update phone number. Please try again.", success: false };
  }

  revalidatePath("/profile");
  return { error: "", success: true };
}

/**
 * Removes the phone number from the user's account.
 * No OTP required — the user is already authenticated and this is a voluntary removal.
 */
export async function removePhoneAction(): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  try {
    await db.user.update({ where: { id: session.user.id }, data: { phone: null } });
  } catch {
    return { error: "Failed to remove phone number. Please try again.", success: false };
  }

  revalidatePath("/profile");
  return { error: "", success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Delete account
// ────────────────────────────────────────────────────────────────────────────

/**
 * Initiates account deletion by sending OTP codes to all contact methods.
 * An email OTP is always sent. If the account has a phone number registered,
 * an SMS OTP is also sent — both must be verified to complete deletion.
 */
export async function sendDeleteOtpAction(): Promise<{
  error: string;
  success: boolean;
  hasPhone: boolean;
}> {
  const { sendSmsOtp } = await import("@/lib/sms");

  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false, hasPhone: false };

  let user;
  try {
    user = await db.user.findUnique({ where: { id: session.user.id } });
  } catch {
    return { error: "Something went wrong. Please try again.", success: false, hasPhone: false };
  }
  if (!user) return { error: "Unauthorized", success: false, hasPhone: false };

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const emailOtp  = crypto.randomInt(100000, 1000000).toString();

  // ---- Email OTP ----
  try {
    await db.passwordResetToken.deleteMany({ where: { email: user.email } });
    // Store SHA-256 hash — never the raw code
    await db.passwordResetToken.create({ data: { email: user.email, token: hashOtp(emailOtp), expiresAt } });
  } catch {
    return { error: "Something went wrong. Please try again.", success: false, hasPhone: false };
  }

  const emailErr = await sendEmailOtp(
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
  if (emailErr) return { error: emailErr, success: false, hasPhone: false };

  // ---- Phone OTP (if user has phone) ----
  if (user.phone) {
    const phoneOtp = crypto.randomInt(100000, 1000000).toString();
    try {
      await db.phoneOtp.deleteMany({ where: { phone: user.phone } });
      // Store SHA-256 hash — never the raw code
      await db.phoneOtp.create({ data: { phone: user.phone, token: hashOtp(phoneOtp), expiresAt } });
    } catch {
      await db.passwordResetToken.deleteMany({ where: { email: user.email } }).catch(() => {});
      return { error: "Something went wrong. Please try again.", success: false, hasPhone: false };
    }

    const smsErr = await sendSmsOtp(user.phone, phoneOtp);
    if (smsErr) {
      await db.passwordResetToken.deleteMany({ where: { email: user.email } }).catch(() => {});
      await db.phoneOtp.deleteMany({ where: { phone: user.phone } }).catch(() => {});
      return { error: smsErr, success: false, hasPhone: false };
    }
  }

  return { error: "", success: true, hasPhone: !!user.phone };
}

/**
 * Permanently deletes the user's account and all associated data.
 * Requires a valid email OTP, plus a phone OTP if the account has one.
 *
 * Data is deleted in dependency order to avoid FK constraint violations:
 *   InvoiceItems → Invoices → Clients → PasswordResetTokens → User
 *
 * After this action the session is still alive; call logoutAfterDeleteAction
 * immediately afterwards to invalidate it.
 */
export async function deleteAccountAction(
  emailOtp: string,
  phoneOtp?: string
): Promise<{ error: string; success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", success: false };

  if (!isValidOtpFormat(emailOtp)) return { error: "Invalid email code format.", success: false };
  if (phoneOtp && !isValidOtpFormat(phoneOtp))
    return { error: "Invalid phone code format.", success: false };

  let user;
  try {
    user = await db.user.findUnique({ where: { id: session.user.id } });
  } catch {
    return { error: "Something went wrong. Please try again.", success: false };
  }
  if (!user) return { error: "Unauthorized", success: false };

  try {
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
  } catch {
    return { error: "Failed to delete account. Please try again.", success: false };
  }

  return { error: "", success: true };
}

/**
 * Signs the user out and redirects to /login.
 * Must be called immediately after deleteAccountAction succeeds
 * so the now-invalid session is cleared from the browser.
 */
export async function logoutAfterDeleteAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
