"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Resend } from "resend";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ---- LOGIN ----
export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  try {
    await signIn("credentials", {
      email:      formData.get("email"),
      password:   formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password. Please try again." };
    }
    throw err;
  }
  return { error: "" };
}

// ---- LOGOUT ----
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

// ---- SEND OTP ----
export async function sendOtpAction(
  email: string
): Promise<{ error: string; success: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return { error: "Email is required.", success: false };

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });

  // Don't reveal whether the email exists — always succeed silently if not found
  if (!user) return { error: "", success: true };

  // Delete any previous OTP for this email
  await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

  // Generate cryptographically secure 6-digit OTP
  const otp       = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.passwordResetToken.create({
    data: { email: normalizedEmail, token: otp, expiresAt },
  });

  // Send OTP email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from:    `Tulluri <${process.env.RESEND_FROM_EMAIL}>`,
      to:      normalizedEmail,
      subject: `${otp} is your Tulluri verification code`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Verification Code</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">

        <tr><td style="background:#1a6b4a;border-radius:12px 12px 0 0;padding:28px 36px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Password Reset</h1>
          <p style="margin:4px 0 0;color:#c8ead8;font-size:13px">Tulluri Invoice Manager</p>
        </td></tr>

        <tr><td style="background:#fff;padding:32px 36px">
          <p style="margin:0 0 8px;color:#1a1a1a;font-size:15px">Hi ${escapeHtml(user.name)},</p>
          <p style="margin:0 0 24px;color:#6b6b6b;font-size:14px;line-height:1.6">
            Use the code below to reset your password. It expires in <strong>10 minutes</strong>.
          </p>

          <div style="background:#f9f8f6;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="margin:0 0 8px;color:#6b6b6b;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:600">Your verification code</p>
            <p style="margin:0;color:#1a6b4a;font-size:40px;font-weight:700;letter-spacing:10px">${otp}</p>
          </div>

          <p style="margin:0;color:#aaa;font-size:13px">
            If you didn&rsquo;t request this, you can safely ignore this email. Your password won&rsquo;t change.
          </p>
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
    if (sendError) {
      console.error("[SEND OTP] Email error:", sendError);
      return { error: "Failed to send email. Please try again.", success: false };
    }
  } catch {
    console.error("[SEND OTP] Unexpected error");
    return { error: "Failed to send email. Please try again.", success: false };
  }

  return { error: "", success: true };
}

// ---- VERIFY OTP ----
export async function verifyOtpAction(
  email: string,
  otp: string
): Promise<{ error: string; success: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  const record = await db.passwordResetToken.findFirst({
    where: { email: normalizedEmail, token: otp },
  });

  if (!record)                        return { error: "Invalid code. Please check and try again.", success: false };
  if (record.expiresAt < new Date())  return { error: "This code has expired. Please request a new one.", success: false };

  return { error: "", success: true };
}

// ---- RESET PASSWORD WITH OTP ----
export async function resetPasswordWithOtpAction(
  email: string,
  otp: string,
  newPassword: string
): Promise<{ error: string; success: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (newPassword.length < 8)
    return { error: "Password must be at least 8 characters.", success: false };

  const record = await db.passwordResetToken.findFirst({
    where: { email: normalizedEmail, token: otp },
  });

  if (!record)                        return { error: "Invalid or expired code.", success: false };
  if (record.expiresAt < new Date())  return { error: "This code has expired. Please request a new one.", success: false };

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { email: normalizedEmail },
    data:  { password: hashed },
  });

  await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

  return { error: "", success: true };
}

// ---- SEND SIGNUP OTP ----
// Sends email OTP always. Also sends SMS OTP if phone is provided.
export async function sendSignupOtpAction(
  email: string,
  phone?: string
): Promise<{ error: string; success: boolean }> {
  const { sendSmsOtp, normalizePhone } = await import("@/lib/sms");

  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return { error: "Email is required.", success: false };

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { error: "An account with this email already exists.", success: false };

  const normalizedPhone = phone ? normalizePhone(phone) : undefined;

  // ---- Email OTP ----
  await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

  const emailOtp  = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.passwordResetToken.create({ data: { email: normalizedEmail, token: emailOtp, expiresAt } });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from:    `Tulluri <${process.env.RESEND_FROM_EMAIL}>`,
      to:      normalizedEmail,
      subject: `${emailOtp} is your Tulluri verification code`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Verify your email</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">
        <tr><td style="background:#1a6b4a;border-radius:12px 12px 0 0;padding:28px 36px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Verify your email</h1>
          <p style="margin:4px 0 0;color:#c8ead8;font-size:13px">Tulluri Invoice Manager</p>
        </td></tr>
        <tr><td style="background:#fff;padding:32px 36px">
          <p style="margin:0 0 24px;color:#6b6b6b;font-size:14px;line-height:1.6">
            Use the code below to verify your email and create your account. It expires in <strong>10 minutes</strong>.
          </p>
          <div style="background:#f9f8f6;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="margin:0 0 8px;color:#6b6b6b;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:600">Your verification code</p>
            <p style="margin:0;color:#1a6b4a;font-size:40px;font-weight:700;letter-spacing:10px">${emailOtp}</p>
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
    if (sendError) {
      console.error("[SIGNUP OTP] Email error:", sendError);
      return { error: "Failed to send verification email. Please try again.", success: false };
    }
  } catch {
    return { error: "Failed to send verification email. Please try again.", success: false };
  }

  // ---- Phone OTP (only if phone was provided) ----
  if (normalizedPhone) {
    await db.phoneOtp.deleteMany({ where: { phone: normalizedPhone } });

    const phoneOtp = crypto.randomInt(100000, 1000000).toString();
    await db.phoneOtp.create({ data: { phone: normalizedPhone, token: phoneOtp, expiresAt } });

    const smsErr = await sendSmsOtp(normalizedPhone, phoneOtp);
    if (smsErr) {
      // Roll back email OTP so user can retry cleanly
      await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });
      return { error: smsErr, success: false };
    }
  }

  return { error: "", success: true };
}

// ---- CREATE ACCOUNT WITH OTP ----
// Verifies email OTP always. Also verifies phone OTP if phone was provided.
export async function createAccountWithOtpAction(
  name: string,
  email: string,
  password: string,
  emailOtp: string,
  phone?: string,
  phoneOtp?: string
): Promise<{ error: string; success: boolean }> {
  const { normalizePhone } = await import("@/lib/sms");

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName     = name.trim();
  const normalizedPhone = phone ? normalizePhone(phone) : undefined;

  if (!trimmedName)        return { error: "Name is required.", success: false };
  if (password.length < 8) return { error: "Password must be at least 8 characters.", success: false };

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { error: "An account with this email already exists.", success: false };

  // Verify email OTP
  const emailRecord = await db.passwordResetToken.findFirst({
    where: { email: normalizedEmail, token: emailOtp },
  });
  if (!emailRecord)                       return { error: "Invalid email code. Please check and try again.", success: false };
  if (emailRecord.expiresAt < new Date()) return { error: "Email code has expired. Please request a new one.", success: false };

  // Verify phone OTP if phone was provided
  if (normalizedPhone) {
    if (!phoneOtp) return { error: "Phone verification code is required.", success: false };
    const phoneRecord = await db.phoneOtp.findFirst({
      where: { phone: normalizedPhone, token: phoneOtp },
    });
    if (!phoneRecord)                       return { error: "Invalid phone code. Please check and try again.", success: false };
    if (phoneRecord.expiresAt < new Date()) return { error: "Phone code has expired. Please request a new one.", success: false };
    await db.phoneOtp.deleteMany({ where: { phone: normalizedPhone } });
  }

  const hashed = await bcrypt.hash(password, 10);
  await db.user.create({
    data: {
      name:  trimmedName,
      email: normalizedEmail,
      password: hashed,
      phone: normalizedPhone ?? null,
    },
  });
  await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

  return { error: "", success: true };
}
