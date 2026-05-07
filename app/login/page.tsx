"use client";

import { useActionState, useEffect, useTransition } from "react";
import { loginAction } from "@/app/actions/auth";
import { NavLink } from "@/components/NavLink";
import { useNavigation } from "@/components/NavigationProgress";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const [isSubmitting, startTransition] = useTransition();
  const { setNavigating } = useNavigation();

  const isBusy = pending || isSubmitting;
  useEffect(() => { if (!isBusy) setNavigating(false); }, [isBusy]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNavigating(true);
    // Explicitly build FormData and call the action — avoids a React
    // re-render race that can drop the server action dispatch on mobile Safari.
    startTransition(() => formAction(new FormData(e.currentTarget)));
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — branding ───────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a6b4a] flex-col justify-between p-12 relative overflow-hidden">

        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#2d9b6f]/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#0f3d2a]/60 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-64 h-64 bg-[#2d9b6f]/10 rounded-full blur-2xl" />
        </div>

        {/* Logo */}
        <div className="relative">
          <NavLink href="/" className="text-2xl font-semibold tracking-tight text-white">
            tulluri<span className="text-[#7dd3a8]">.</span>
          </NavLink>
        </div>

        {/* Center content */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-semibold text-white leading-snug">
              Your invoices.<br />Your clients.<br />All in one place.
            </h2>
            <p className="mt-4 text-[#a7d9c0] text-sm leading-relaxed max-w-xs">
              GST-ready invoicing built for Indian freelancers. Create, send, and
              track payments without the spreadsheet chaos.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {[
              "Professional PDF invoices in 60 seconds",
              "Auto-calculated GST with GSTIN support",
              "One-click email delivery to clients",
              "Real-time payment status tracking",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-[#c8ead8]">
                <span className="w-5 h-5 rounded-full bg-[#2d9b6f]/40 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-[#7dd3a8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom quote */}
        <div className="relative border-t border-[#2d9b6f]/40 pt-6">
          <p className="text-[#a7d9c0] text-sm italic">
            &ldquo;Finally an invoicing tool that doesn&rsquo;t feel like accounting software.&rdquo;
          </p>
          <p className="text-[#7dd3a8] text-xs mt-2 font-medium">— Indian freelancer</p>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-[#f5f4f0]">
        <div className="w-full max-w-sm mx-auto">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <NavLink href="/" className="text-2xl font-semibold tracking-tight text-[#1a1a1a]">
              tulluri<span className="text-[#2d9b6f]">.</span>
            </NavLink>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#1a1a1a]">Welcome back</h1>
            <p className="text-sm text-[#6b6b6b] mt-1">Sign in to continue to your dashboard</p>
          </div>

          {/* Error */}
          {state?.error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-600
                            text-sm rounded-xl px-4 py-3 mb-6">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              {state.error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#1a1a1a]">
                Email address
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full px-4 py-3 text-sm bg-white border border-[#e0ddd6] rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] focus:border-transparent
                           placeholder:text-[#ccc] transition shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#1a1a1a]">
                  Password
                </label>
                <NavLink href="/forgot-password" className="text-xs text-[#2d9b6f] hover:underline">
                  Forgot password?
                </NavLink>
              </div>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 text-sm bg-white border border-[#e0ddd6] rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] focus:border-transparent
                           placeholder:text-[#ccc] transition shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="w-full bg-[#1a6b4a] text-white py-3 rounded-xl text-sm font-semibold
                         hover:bg-[#2d9b6f] transition-colors shadow-sm
                         disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isBusy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#e0ddd6]" />
            <span className="text-xs text-[#aaa]">or</span>
            <div className="flex-1 h-px bg-[#e0ddd6]" />
          </div>

          {/* Sign up CTA */}
          <div className="bg-white border border-[#e0ddd6] rounded-xl px-5 py-4 text-center shadow-sm">
            <p className="text-sm text-[#6b6b6b]">Don&apos;t have an account?</p>
            <NavLink
              href="/signup"
              className="mt-2 w-full justify-center border border-[#1a6b4a] text-[#1a6b4a]
                         text-sm font-semibold py-2.5 rounded-lg hover:bg-[#e8f5ee] transition-colors"
            >
              Create one free
            </NavLink>
          </div>

        </div>
      </div>
    </div>
  );
}
