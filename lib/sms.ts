// ============================================================
// lib/sms.ts — SMS / Twilio Helper
//
// Wraps the Twilio SDK for sending OTP verification codes
// via SMS. All phone numbers must be in E.164 format.
//
// Required env variables:
//   TWILIO_ACCOUNT_SID   — your Twilio Account SID
//   TWILIO_AUTH_TOKEN    — your Twilio Auth Token
//   TWILIO_PHONE_NUMBER  — your purchased Twilio number (e.g. +17014509415)
//
// Usage:
//   const err = await sendSmsOtp("+919876543210", "482910");
//   if (err) showError(err);  // null means success
// ============================================================

import twilio from "twilio";

// E.164 format: starts with +, followed by 7–15 digits (no spaces or dashes)
const E164_REGEX = /^\+\d{7,15}$/;

/**
 * Strips spaces, dashes, and parentheses from a phone string while
 * keeping the leading + sign.
 * Example: "+91 98765-43210" → "+919876543210"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

/**
 * Returns true if the phone number is valid E.164.
 * Twilio requires this format, and it unambiguously encodes the country code.
 */
export function isValidPhone(phone: string): boolean {
  return E164_REGEX.test(phone);
}

/**
 * Sends a 6-digit OTP via SMS using the Twilio Messages API.
 *
 * @param to  Destination phone in E.164 format (e.g. +919876543210)
 * @param otp The 6-digit code to include in the message body
 * @returns   null on success, or a human-readable error string on failure
 */
export async function sendSmsOtp(to: string, otp: string): Promise<string | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  // All three env vars must be present; missing vars mean SMS is not configured
  if (!accountSid || !authToken || !from) {
    console.error("[SMS] Twilio env vars not set (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)");
    return "SMS service is not configured. Please contact support.";
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: `${otp} is your Tulluri verification code. Valid for 10 minutes. Do not share this code.`,
      from,
      to,
    });
    return null; // null = success
  } catch (err) {
    console.error("[SMS] Send error:", err);
    return "Failed to send SMS. Please check the phone number (include country code, e.g. +91) and try again.";
  }
}
