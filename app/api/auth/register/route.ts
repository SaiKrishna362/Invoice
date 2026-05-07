// ============================================================
// app/api/auth/register/route.ts — Direct Registration Blocker
//
// POST /api/auth/register — intentionally returns 410 Gone.
//
// Registration must go through the /signup page which enforces
// OTP email (and optional phone) verification. This endpoint is
// disabled so no one can create an unverified account by calling
// the API directly, bypassing the OTP step.
// ============================================================

import { NextResponse } from "next/server";

// Registration is handled via the /signup page with OTP email verification.
// This endpoint is intentionally disabled to prevent bypassing OTP verification.
export async function POST() {
  return NextResponse.json(
    { error: "Use the signup page to create an account. Direct API registration is not permitted." },
    { status: 410 } // 410 Gone
  );
}
