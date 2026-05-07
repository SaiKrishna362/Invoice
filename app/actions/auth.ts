// ============================================================
// app/actions/auth.ts — Authentication Server Actions
//
// All functions here run on the server ("use server").
// They are called directly from client components via
// React's useActionState / useTransition.
//
// Actions:
//   loginAction               — sign in with email + password
//   logoutAction              — sign out and redirect to /login
//   sendOtpAction             — send forgot-password OTP email
//   verifyOtpAction           — verify OTP without consuming it (step 2 of 3)
//   resetPasswordWithOtpAction — verify + consume OTP, then update password (step 3 of 3)
//   sendSignupOtpAction       — send OTP(s) before new account creation
//   createAccountWithOtpAction — verify OTP(s) and create the user record
// ============================================================

"use server";

import { signIn, signOut } from "@/auth";
import { AuthError }       from "next-auth";
import { db }              from "@/lib/db";
import bcrypt              from "bcryptjs";
import crypto              from "node:crypto";
import { Resend }          from "resend";
import { verifyEmailOtp, verifyPhoneOtp, isValidOtpFormat, isValidEmail } from "@/lib/otp";

// Server-side input length limits — mirrors the DB column constraints
const MAX_NAME     = 100;
const MAX_EMAIL    = 254;
const MAX_PASSWORD = 128;
const MAX_PHONE    = 20;

/**
 * Escapes special HTML characters so user input is safe to embed in
 * email HTML without enabling XSS.
 */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ────────────────────────────────────────────────────────────────────────────
// Login
// ────────────────────────────────────────────────────────────────────────────

/**
 * Authenticates the user with email and password.
 * On success, NextAuth sets a JWT cookie and redirects to /dashboard.
 * Returns a generic error message on failure to avoid leaking which field is wrong.
 */
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
    throw err; // Re-throw non-auth errors (network, DB, etc.)
  }
  return { error: "" };
}

// ────────────────────────────────────────────────────────────────────────────
// Logout
// ────────────────────────────────────────────────────────────────────────────

/**
 * Signs out the current user and redirects to /login.
 * Called by the SignOutButton component after the user confirms.
 */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

// ────────────────────────────────────────────────────────────────────────────
// Forgot password — Step 1: send OTP email
// ────────────────────────────────────────────────────────────────────────────

/**
 * Sends a 6-digit OTP to the given email for password reset.
 *
 * IMPORTANT: We always return success=true even if the email doesn't exist.
 * This prevents account enumeration — the user cannot tell whether the
 * address is registered just from this response.
 */
export async function sendOtpAction(
  email: string
): Promise<{ error: string; success: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail)                   return { error: "Email is required.",      success: false };
  if (normalizedEmail.length > MAX_EMAIL) return { error: "Invalid email.",          success: false };
  if (!isValidEmail(normalizedEmail))     return { error: "Invalid email format.",   success: false };

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });

  // Silently succeed for unknown addresses — prevents email enumeration
  if (!user) return { error: "", success: true };

  // Delete any existing OTP for this email before creating a fresh one
  await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

  const otp       = crypto.randomInt(100000, 1000000).toString(); // Cryptographically secure 6-digit code
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);        // Valid for 10 minutes
  await db.passwordResetToken.create({ data: { email: normalizedEmail, token: otp, expiresAt } });

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
          <p style="margin:0;color:#aaa;font-size:13px">If you didn&rsquo;t request this, you can safely ignore this email. Your password won&rsquo;t change.</p>
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
    return { error: "Failed to send email. Please try again.", success: false };
  }

  return { error: "", success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Forgot password — Step 2: verify OTP (non-consuming)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Checks the submitted OTP without deleting it.
 * This lets the user advance to the "new password" step without consuming the
 * token — the final step (resetPasswordWithOtpAction) will consume it.
 */
export async function verifyOtpAction(
  email: string,
  otp: string
): Promise<{ error: string; success: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!isValidOtpFormat(otp)) return { error: "Invalid code format.", success: false };

  // consume=false: keep the token alive for the password-reset step
  const err = await verifyEmailOtp(normalizedEmail, otp, false);
  if (err) return { error: err, success: false };
  return { error: "", success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Forgot password — Step 3: verify OTP (consuming) + set new password
// ────────────────────────────────────────────────────────────────────────────

/**
 * Final step of the forgot-password flow.
 * Verifies the OTP (and consumes it), then hashes and saves the new password.
 */
export async function resetPasswordWithOtpAction(
  email: string,
  otp: string,
  newPassword: string
): Promise<{ error: string; success: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (!isValidOtpFormat(otp))         return { error: "Invalid code format.",               success: false };
  if (newPassword.length < 8)         return { error: "Password must be at least 8 characters.", success: false };
  if (newPassword.length > MAX_PASSWORD) return { error: "Password is too long.",            success: false };

  // consume=true: delete the token so it cannot be reused
  const err = await verifyEmailOtp(normalizedEmail, otp, true);
  if (err) return { error: err, success: false };

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { email: normalizedEmail }, data: { password: hashed } });

  return { error: "", success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Signup — Step 1: send OTP(s) to verify email (and optionally phone)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Sends verification codes before creating a new account:
 *   - Always sends an OTP to the provided email
 *   - If a phone number is given, also sends an OTP via SMS
 *
 * Both codes must be verified in createAccountWithOtpAction before
 * the account is actually created.
 */
export async function sendSignupOtpAction(
  email: string,
  phone?: string
): Promise<{ error: string; success: boolean }> {
  const { sendSmsOtp, normalizePhone, isValidPhone } = await import("@/lib/sms");

  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail)                   return { error: "Email is required.",    success: false };
  if (normalizedEmail.length > MAX_EMAIL) return { error: "Invalid email.",        success: false };
  if (!isValidEmail(normalizedEmail))     return { error: "Invalid email format.", success: false };

  // Reject if an account with this email already exists
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { error: "An account with this email already exists.", success: false };

  // Validate phone if provided
  let normalizedPhone: string | undefined;
  if (phone?.trim()) {
    normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length > MAX_PHONE) return { error: "Invalid phone number.", success: false };
    if (!isValidPhone(normalizedPhone))
      return { error: "Phone must be in E.164 format, e.g. +919876543210.", success: false };
  }

  // ── Email OTP ────────────────────────────────────────────────────────
  // Clear any previous signup OTP for this address first
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

  // ── Phone OTP (only when a phone number was provided) ─────────────────
  if (normalizedPhone) {
    await db.phoneOtp.deleteMany({ where: { phone: normalizedPhone } });
    const phoneOtp = crypto.randomInt(100000, 1000000).toString();
    await db.phoneOtp.create({ data: { phone: normalizedPhone, token: phoneOtp, expiresAt } });

    const smsErr = await sendSmsOtp(normalizedPhone, phoneOtp);
    if (smsErr) {
      // SMS failed — roll back the email OTP so the user can retry cleanly
      await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });
      return { error: smsErr, success: false };
    }
  }

  return { error: "", success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Signup — Step 2: verify OTP(s) and create the user account
// ────────────────────────────────────────────────────────────────────────────

/**
 * Called after the user fills in the OTP boxes on the signup page.
 * Verifies email OTP (and phone OTP if applicable), then creates the
 * user record. Both OTPs are consumed (deleted) on success.
 */
export async function createAccountWithOtpAction(
  name:      string,
  email:     string,
  password:  string,
  emailOtp:  string,
  phone?:    string,
  phoneOtp?: string
): Promise<{ error: string; success: boolean }> {
  const { normalizePhone, isValidPhone } = await import("@/lib/sms");

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName     = name.trim();

  // Server-side validation (mirrors the client-side checks)
  if (!trimmedName)                       return { error: "Name is required.",                    success: false };
  if (trimmedName.length > MAX_NAME)      return { error: "Name is too long.",                    success: false };
  if (!isValidEmail(normalizedEmail))     return { error: "Invalid email format.",                success: false };
  if (password.length < 8)               return { error: "Password must be at least 8 characters.", success: false };
  if (password.length > MAX_PASSWORD)    return { error: "Password is too long.",                 success: false };
  if (!isValidOtpFormat(emailOtp))       return { error: "Invalid email code format.",            success: false };

  let normalizedPhone: string | undefined;
  if (phone?.trim()) {
    normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone))
      return { error: "Phone must be in E.164 format, e.g. +919876543210.", success: false };
    if (!isValidOtpFormat(phoneOtp ?? ""))
      return { error: "Invalid phone code format.", success: false };
  }

  // Race-condition guard: check again that the email is still not taken
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { error: "An account with this email already exists.", success: false };

  // Verify and consume the email OTP
  const emailErr = await verifyEmailOtp(normalizedEmail, emailOtp, true);
  if (emailErr) return { error: emailErr, success: false };

  // Verify and consume the phone OTP (if phone was provided during signup)
  if (normalizedPhone && phoneOtp) {
    const phoneErr = await verifyPhoneOtp(normalizedPhone, phoneOtp);
    if (phoneErr) return { error: phoneErr, success: false };
  }

  // All checks passed — hash password and create the account
  const hashed = await bcrypt.hash(password, 10);
  await db.user.create({
    data: {
      name:     trimmedName,
      email:    normalizedEmail,
      password: hashed,
      phone:    normalizedPhone ?? null,
    },
  });

  return { error: "", success: true };
}
