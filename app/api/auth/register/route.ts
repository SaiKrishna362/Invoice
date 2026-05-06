// ============================================
// app/api/auth/register/route.ts
// API route: POST /api/auth/register
//
// Creates a new user account.
// Called from the signup page form.
// Password is hashed with bcrypt before saving.
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // ---- READ REQUEST BODY ----
    const { name, email, password } = await req.json();

    // ---- VALIDATE INPUTS ----
    const normalizedEmail = (email as string)?.toLowerCase().trim();
    if (!name || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 } // 400 = Bad Request
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // ---- CHECK FOR DUPLICATE EMAIL ----
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 } // 409 = Conflict
      );
    }

    // ---- HASH THE PASSWORD ----
    // Never store plain text passwords!
    // bcrypt.hash adds a "salt" and runs 10 rounds of hashing.
    // This makes it extremely hard to reverse even if DB is leaked.
    const hashedPassword = await bcrypt.hash(password, 10);

    // ---- SAVE USER TO DATABASE ----
    const user = await db.user.create({
      data: { name: (name as string).trim(), email: normalizedEmail, password: hashedPassword },
    });

    // Return success — exclude password from response
    return NextResponse.json(
      { message: "Account created successfully.", userId: user.id },
      { status: 201 } // 201 = Created
    );

  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 } // 500 = Internal Server Error
    );
  }
}
