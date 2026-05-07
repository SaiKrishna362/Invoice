// ============================================================
// app/signup/page.tsx — Sign Up Page
//
// Three-step account creation flow:
//
//   Step 1 "form"  — Collect name, email, optional phone, and password.
//                    Calls sendSignupOtpAction which sends OTP(s) and
//                    advances to the OTP step.
//
//   Step 2 "otp"   — Enter email verification code (and phone code if
//                    a phone was provided). Calls createAccountWithOtpAction
//                    which verifies both codes and creates the user record.
//
//   Step 3 "done"  — Success screen with a "Sign in" button.
//
// Both verification codes are entered on the same screen so the user
// sees a single verification step regardless of how many channels they used.
//
// Route: /signup (public)
// ============================================================

"use client";

import { useState, useTransition, useEffect } from "react";
import { OtpInput, EMPTY_OTP } from "@/components/OtpInput";
import {
  sendSignupOtpAction,
  createAccountWithOtpAction,
} from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { NavLink } from "@/components/NavLink";
import { useNavigation } from "@/components/NavigationProgress";

type Step = "form" | "otp" | "done";

export default function SignupPage() {
  const router = useRouter();

  const [step,      setStep]      = useState<Step>("form");
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [password,  setPassword]  = useState("");
  const [emailOtp,  setEmailOtp]  = useState<string[]>(EMPTY_OTP());
  const [phoneOtp,  setPhoneOtp]  = useState<string[]>(EMPTY_OTP());
  const [error,     setError]     = useState("");
  const [isPending, start]        = useTransition();
  const { setNavigating } = useNavigation();
  useEffect(() => { if (!isPending) setNavigating(false); }, [isPending]);

  const hasPhone = phone.trim().length > 0;

  // ---------- Step 1: send OTPs ----------
  function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setNavigating(true);
    start(async () => {
      const res = await sendSignupOtpAction(email, hasPhone ? phone.trim() : undefined);
      if (res.error) { setError(res.error); return; }
      setEmailOtp(EMPTY_OTP());
      setPhoneOtp(EMPTY_OTP());
      setStep("otp");
    });
  }

  // ---------- Step 2: verify + create ----------
  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const emailCode = emailOtp.join("");
    const phoneCode = phoneOtp.join("");
    if (emailCode.length < 6) { setError("Please enter the full email verification code."); return; }
    if (hasPhone && phoneCode.length < 6) { setError("Please enter the full phone verification code."); return; }
    setNavigating(true);
    start(async () => {
      const res = await createAccountWithOtpAction(
        name, email, password, emailCode,
        hasPhone ? phone.trim() : undefined,
        hasPhone ? phoneCode : undefined
      );
      if (res.error) { setError(res.error); return; }
      setStep("done");
    });
  }

  function handleResend() {
    setError("");
    setEmailOtp(EMPTY_OTP());
    setPhoneOtp(EMPTY_OTP());
    setNavigating(true);
    start(async () => {
      const res = await sendSignupOtpAction(email, hasPhone ? phone.trim() : undefined);
      if (res.error) setError(res.error);
    });
  }

  const subtitles: Record<Step, string> = {
    form: "Create your free account",
    otp:  "Verify your identity",
    done: "You're all set!",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">
            tulluri<span className="text-[#2d9b6f]">.</span>
          </h1>
          <p className="text-[#6b6b6b] text-sm mt-2">{subtitles[step]}</p>
        </div>

        <div className="bg-white border border-[#e0ddd6] rounded-2xl p-8">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* ---- STEP 1: account details ---- */}
          {step === "form" && (
            <>
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ravi Kumar"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] focus:border-transparent
                               placeholder:text-[#bbb] transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ravi@example.com"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] focus:border-transparent
                               placeholder:text-[#bbb] transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    Mobile number
                    <span className="text-[#aaa] font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] focus:border-transparent
                               placeholder:text-[#bbb] transition"
                  />
                  {phone.trim() && (
                    <p className="text-xs text-[#6b6b6b] mt-1">
                      Include country code, e.g. +91 for India. An OTP will be sent to this number.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] focus:border-transparent
                               placeholder:text-[#bbb] transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-[#1a6b4a] text-white py-2.5 rounded-lg text-sm font-medium
                             hover:bg-[#2d9b6f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending
                    ? "Sending code…"
                    : hasPhone
                      ? "Continue — we'll send codes to both"
                      : "Continue — we'll send a code to your email"}
                </button>
              </form>

              <p className="text-center text-sm text-[#6b6b6b] mt-6">
                Already have an account?{" "}
                <NavLink href="/login" className="text-[#2d9b6f] font-medium hover:underline">
                  Sign in
                </NavLink>
              </p>
            </>
          )}

          {/* ---- STEP 2: verify OTPs ---- */}
          {step === "otp" && (
            <>
              <div className="mb-5 space-y-1 text-sm text-[#6b6b6b]">
                <p>We sent verification codes to:</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-base">📧</span>
                  <span className="font-medium text-[#1a1a1a] break-all">{email}</span>
                </div>
                {hasPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-base">📱</span>
                    <span className="font-medium text-[#1a1a1a]">{phone.trim()}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                    Email verification code
                  </label>
                  <OtpInput otp={emailOtp} onChange={setEmailOtp} autoFocus />
                </div>

                {hasPhone && (
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                      Phone verification code
                    </label>
                    <OtpInput otp={phoneOtp} onChange={setPhoneOtp} />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isPending ||
                    emailOtp.join("").length < 6 ||
                    (hasPhone && phoneOtp.join("").length < 6)
                  }
                  className="w-full bg-[#1a6b4a] text-white py-2.5 rounded-lg text-sm font-medium
                             hover:bg-[#2d9b6f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? "Creating account…" : "Verify & Create Account"}
                </button>
              </form>

              <div className="flex items-center justify-between mt-5 text-sm text-[#6b6b6b]">
                <button
                  onClick={() => { setStep("form"); setError(""); }}
                  className="hover:text-[#1a1a1a] transition-colors"
                >
                  ← Change details
                </button>
                <button
                  onClick={handleResend}
                  disabled={isPending}
                  className="text-[#2d9b6f] font-medium hover:underline disabled:opacity-60"
                >
                  Resend codes
                </button>
              </div>
            </>
          )}

          {/* ---- STEP 3: done ---- */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#1a1a1a] mb-1">Account created!</p>
              <p className="text-sm text-[#6b6b6b] mb-6">
                {hasPhone
                  ? "Your email and mobile have been verified. You can now sign in."
                  : "Your email has been verified. You can now sign in."}
              </p>
              <button
                onClick={() => router.push("/login")}
                className="inline-block bg-[#1a6b4a] text-white text-sm font-medium px-6 py-2.5
                           rounded-lg hover:bg-[#2d9b6f] transition-colors"
              >
                Sign in
              </button>
            </div>
          )}

        </div>

        {step === "form" && (
          <p className="text-center text-xs text-[#aaa] mt-4">
            Free forever for up to 5 invoices/month. No credit card needed.
          </p>
        )}
      </div>
    </div>
  );
}
