import { db } from "@/lib/db";

export const MAX_OTP_ATTEMPTS = 5;

// Validates that a submitted code is exactly 6 digits.
export function isValidOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

// Validates an email address format.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Verifies an email-based OTP with attempt limiting.
 * Returns an error string on failure, null on success.
 * Pass consume=true to delete the token after successful verification (final step).
 * Pass consume=false for intermediate checks that need the token to persist.
 */
export async function verifyEmailOtp(
  email: string,
  submittedOtp: string,
  consume: boolean
): Promise<string | null> {
  const record = await db.passwordResetToken.findFirst({ where: { email } });

  if (!record) return "No active verification code. Please request a new one.";

  if (record.expiresAt < new Date()) {
    await db.passwordResetToken.deleteMany({ where: { email } });
    return "Code has expired. Please request a new one.";
  }

  if (record.token !== submittedOtp) {
    const newAttempts = record.attempts + 1;
    if (newAttempts >= MAX_OTP_ATTEMPTS) {
      await db.passwordResetToken.deleteMany({ where: { email } });
      return "Too many incorrect attempts. Please request a new code.";
    }
    await db.passwordResetToken.update({
      where: { id: record.id },
      data:  { attempts: newAttempts },
    });
    const remaining = MAX_OTP_ATTEMPTS - newAttempts;
    return `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;
  }

  if (consume) {
    await db.passwordResetToken.deleteMany({ where: { email } });
  }
  return null; // success
}

/**
 * Verifies a phone-based OTP with attempt limiting.
 * Always consumes (deletes) the token on success.
 * Returns an error string on failure, null on success.
 */
export async function verifyPhoneOtp(
  phone: string,
  submittedOtp: string
): Promise<string | null> {
  const record = await db.phoneOtp.findFirst({ where: { phone } });

  if (!record) return "No active verification code. Please request a new one.";

  if (record.expiresAt < new Date()) {
    await db.phoneOtp.deleteMany({ where: { phone } });
    return "Code has expired. Please request a new one.";
  }

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

  await db.phoneOtp.deleteMany({ where: { phone } });
  return null; // success
}
