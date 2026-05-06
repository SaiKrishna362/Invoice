"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import {
  sendOtpAction,
  verifyOtpAction,
  resetPasswordWithOtpAction,
} from "@/app/actions/auth";
import Link from "next/link";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep]       = useState<Step>("email");
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [error, setError]     = useState("");
  const [isPending, start]    = useTransition();

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ---------- Step 1: send OTP ----------
  function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const val = (new FormData(e.currentTarget).get("email") as string).toLowerCase().trim();
    start(async () => {
      const res = await sendOtpAction(val);
      if (res.error) { setError(res.error); return; }
      setEmail(val);
      setStep("otp");
    });
  }

  // ---------- Step 2: OTP input ----------
  const handleOtpChange = useCallback((idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setOtp(prev => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  }, []);

  const handleOtpKeyDown = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }, [otp]);

  const handleOtpPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (!digits.length) return;
    setOtp(prev => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      return next;
    });
    const lastIdx = Math.min(digits.length, 5);
    otpRefs.current[lastIdx]?.focus();
  }, []);

  function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit code."); return; }
    start(async () => {
      const res = await verifyOtpAction(email, code);
      if (res.error) { setError(res.error); return; }
      setStep("password");
    });
  }

  function handleResend() {
    setError("");
    setOtp(["", "", "", "", "", ""]);
    start(async () => {
      const res = await sendOtpAction(email);
      if (res.error) setError(res.error);
      else otpRefs.current[0]?.focus();
    });
  }

  // ---------- Step 3: new password ----------
  function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const newPassword    = fd.get("password")    as string;
    const confirmPassword = fd.get("confirmPassword") as string;
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    if (newPassword.length < 8)          { setError("Password must be at least 8 characters."); return; }
    const code = otp.join("");
    start(async () => {
      const res = await resetPasswordWithOtpAction(email, code, newPassword);
      if (res.error) { setError(res.error); return; }
      setStep("done");
    });
  }

  // ---------- Shared card wrapper ----------
  const subtitles: Record<Step, string> = {
    email:    "Reset your password",
    otp:      "Check your email",
    password: "Choose a new password",
    done:     "Password updated",
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

          {/* ---- STEP 1: email ---- */}
          {step === "email" && (
            <>
              <p className="text-sm text-[#6b6b6b] mb-5">
                Enter your email and we&apos;ll send you a 6-digit verification code.
              </p>
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
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
                  {isPending ? "Sending…" : "Send Code"}
                </button>
              </form>
              <p className="text-center text-sm text-[#6b6b6b] mt-6">
                <Link href="/login" className="text-[#2d9b6f] font-medium hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}

          {/* ---- STEP 2: OTP ---- */}
          {step === "otp" && (
            <>
              <p className="text-sm text-[#6b6b6b] mb-1">
                We sent a 6-digit code to
              </p>
              <p className="text-sm font-medium text-[#1a1a1a] mb-6 break-all">{email}</p>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                    Verification code
                  </label>
                  <div className="flex gap-2 justify-between">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        className="w-11 h-12 text-center text-lg font-semibold border border-[#e0ddd6]
                                   rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]
                                   focus:border-transparent transition"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending || otp.join("").length < 6}
                  className="w-full bg-[#1a6b4a] text-white py-2.5 rounded-lg text-sm font-medium
                             hover:bg-[#2d9b6f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? "Verifying…" : "Verify Code"}
                </button>
              </form>

              <div className="flex items-center justify-between mt-5 text-sm text-[#6b6b6b]">
                <button
                  onClick={() => { setStep("email"); setError(""); }}
                  className="hover:text-[#1a1a1a] transition-colors"
                >
                  ← Change email
                </button>
                <button
                  onClick={handleResend}
                  disabled={isPending}
                  className="text-[#2d9b6f] font-medium hover:underline disabled:opacity-60"
                >
                  Resend code
                </button>
              </div>
            </>
          )}

          {/* ---- STEP 3: new password ---- */}
          {step === "password" && (
            <>
              <p className="text-sm text-[#6b6b6b] mb-5">
                Enter a new password for <span className="font-medium text-[#1a1a1a]">{email}</span>.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    New password
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] focus:border-transparent
                               placeholder:text-[#bbb] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Repeat your password"
                    required
                    minLength={8}
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
                  {isPending ? "Saving…" : "Set New Password"}
                </button>
              </form>
            </>
          )}

          {/* ---- STEP 4: done ---- */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#1a1a1a] mb-1">Password updated!</p>
              <p className="text-sm text-[#6b6b6b] mb-6">You can now sign in with your new password.</p>
              <Link
                href="/login"
                className="inline-block bg-[#1a6b4a] text-white text-sm font-medium px-6 py-2.5
                           rounded-lg hover:bg-[#2d9b6f] transition-colors"
              >
                Sign in
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
