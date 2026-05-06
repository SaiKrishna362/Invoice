"use client";

import { useEffect, useRef } from "react";

interface Props {
  otp: string[];
  onChange: (next: string[]) => void;
  autoFocus?: boolean;
}

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
