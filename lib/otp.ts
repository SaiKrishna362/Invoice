// ============================================================
// lib/otp.ts — OTP Verification Helpers
//
// Shared logic for verifying one-time passwords (OTPs)
// for both email-based and SMS-based flows.
//
// Features:
//   - Brute-force protection: locks token after 5 wrong guesses
//   - Expiry checking: tokens are valid for 10 minutes
//   - Consume mode: optionally deletes the token after success
//     so it cannot be reused
//
// Used by: actions/auth.ts, actions/profile.ts
// ============================================================

import { db } from "@/lib/db";

// Maximum number of wrong OTP guesses before the token is invalidated
export const MAX_OTP_ATTEMPTS = 5;

// Returns true only if the submitted code is exactly 6 digits
export function isValidOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

// Basic email format check used across all server actions
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Verifies an email-based OTP stored in the PasswordResetToken table.
 *
 * @param email        The email address the OTP was sent to
 * @param submittedOtp The 6-digit code the user typed
 * @param consume      If true, the token is deleted after a successful match
 *                     so it cannot be verified again (use for final steps).
 *                     If false, the token is kept (use for intermediate "peek" checks).
 * @returns null on success, or an error string to show the user
 */
export async function verifyEmailOtp(
  email: string,
  submittedOtp: string,
  consume: boolean
): Promise<string | null> {
  // Look up the most recent OTP record for this email
  const record = await db.passwordResetToken.findFirst({ where: { email } });

  if (!record) return "No active verification code. Please request a new one.";

  // Token has passed its 10-minute window — clean up and reject
  if (record.expiresAt < new Date()) {
    await db.passwordResetToken.deleteMany({ where: { email } });
    return "Code has expired. Please request a new one.";
  }

  // Wrong code — increment the attempt counter
  if (record.token !== submittedOtp) {
    const newAttempts = record.attempts + 1;

    // Reached the limit — nuke the token so the user must request a fresh one
    if (newAttempts >= MAX_OTP_ATTEMPTS) {
      await db.passwordResetToken.deleteMany({ where: { email } });
      return "Too many incorrect attempts. Please request a new code.";
    }

    // Still have attempts left — save the new count and tell the user how many remain
    await db.passwordResetToken.update({
      where: { id: record.id },
      data:  { attempts: newAttempts },
    });
    const remaining = MAX_OTP_ATTEMPTS - newAttempts;
    return `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;
  }

  // Correct code — delete the token if this is a consuming (final) verification step
  if (consume) {
    await db.passwordResetToken.deleteMany({ where: { email } });
  }

  return null; // null = success
}

/**
 * Verifies a phone-based OTP stored in the PhoneOtp table.
 * Always consumes (deletes) the token on success — phone OTPs are single-use.
 *
 * @param phone        E.164 phone number the OTP was sent to (e.g. +919876543210)
 * @param submittedOtp The 6-digit code the user typed
 * @returns null on success, or an error string to show the user
 */
export async function verifyPhoneOtp(
  phone: string,
  submittedOtp: string
): Promise<string | null> {
  const record = await db.phoneOtp.findFirst({ where: { phone } });

  if (!record) return "No active verification code. Please request a new one.";

  // Expired — clean up and reject
  if (record.expiresAt < new Date()) {
    await db.phoneOtp.deleteMany({ where: { phone } });
    return "Code has expired. Please request a new one.";
  }

  // Wrong code — increment attempt counter
  if (record.token !== submittedOtp) {
    const newAttempts = record.attempts + 1;

    if (newAttempts >= MAX_OTP_ATTEMPTS) {
      await db.phoneOtp.deleteMany({ where: { phone } });
      return "Too many incorrect attempts. Please request a new code.";
    }

    await db.phoneOtp.update({
      where: { id: record.id },
      data:  { attempts: newAttempts },
    });
    const remaining = MAX_OTP_ATTEMPTS - newAttempts;
    return `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;
  }

  // Correct — always consume phone OTPs after success
  await db.phoneOtp.deleteMany({ where: { phone } });
  return null; // null = success
}
