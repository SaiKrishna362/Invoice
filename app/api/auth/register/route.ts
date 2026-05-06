import { NextResponse } from "next/server";

// Registration is handled via the /signup page with OTP email verification.
// This endpoint is intentionally disabled to prevent bypassing OTP verification.
export async function POST() {
  return NextResponse.json(
    { error: "Use the signup page to create an account. Direct API registration is not permitted." },
    { status: 410 } // 410 Gone
  );
}
