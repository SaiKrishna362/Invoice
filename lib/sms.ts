import twilio from "twilio";

// Normalise phone: strip spaces/dashes, keep leading +
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
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
    return "Failed to send SMS. Please check the number and try again.";
  }
}
