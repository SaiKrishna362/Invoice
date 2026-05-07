// ============================================================
// components/OtpInput.tsx — 6-Digit OTP Input
//
// Accessible one-digit-per-box OTP entry component.
// Keyboard behaviour mirrors what users expect from SMS apps:
//   - Typing a digit moves focus to the next box automatically
//   - Backspace on an empty box moves focus back to the previous box
//   - Pasting a 6-digit string fills all boxes at once
//
// State is lifted: the parent owns the `otp` array and provides
// an `onChange` callback. This lets the parent validate or submit
// the code without needing a ref to the input.
//
// EMPTY_OTP() is exported so parents can reset the input easily.
// ============================================================

"use client";

import { useEffect, useRef } from "react";

interface Props {
  otp: string[];
  onChange: (next: string[]) => void;
  autoFocus?: boolean;
}

/**
 * Six-box OTP input.
 * Controlled component — the parent owns the array via `otp` + `onChange`.
 *
 * @param otp        Array of 6 single-digit strings (use EMPTY_OTP() to initialise)
 * @param onChange   Called with the updated array whenever a digit changes
 * @param autoFocus  If true, the first box is focused on mount
 */
export function OtpInput({ otp, onChange, autoFocus = false }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function update(idx: number, digit: string) {
    const next = [...otp];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (!digits.length) return;
    const next = [...otp];
    digits.forEach((d, i) => { next[i] = d; });
    onChange(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
  }

  return (
    <div className="flex gap-2 justify-between">
      {otp.map((digit, idx) => (
        <input
          key={idx}
          ref={el => { refs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => update(idx, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={e => handleKeyDown(idx, e)}
          onPaste={idx === 0 ? handlePaste : undefined}
          className="w-11 h-12 text-center text-lg font-semibold border border-[#e0ddd6]
                     rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d9b6f]
                     focus:border-transparent transition"
        />
      ))}
    </div>
  );
}

export const EMPTY_OTP = () => ["", "", "", "", "", ""];
