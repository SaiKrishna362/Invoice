import twilio from "twilio";

// E.164: must start with +, followed by 7–15 digits (no spaces/dashes)
const E164_REGEX = /^\+\d{7,15}$/;

// Strip spaces, dashes, and parentheses — keeps the leading +
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

// Returns true only for well-formed E.164 numbers
export function isValidPhone(phone: string): boolean {
  return E164_REGEX.test(phone);
}

// Returns an error string on failure, null on success
export async function sendSmsOtp(to: string, otp: string): Promise<string | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

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
    return null;
  } catch (err) {
    console.error("[SMS] Send error:", err);
    return "Failed to send SMS. Please check the phone number (include country code, e.g. +91) and try again.";
  }
}
