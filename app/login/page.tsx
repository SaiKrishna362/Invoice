"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import Link from "next/link";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1a1a1a]">
            tulluri<span className="text-[#2d9b6f]">.</span>
          </h1>
          <p className="text-[#6b6b6b] text-sm mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white border border-[#e0ddd6] rounded-2xl p-8">

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-5">

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

            <div>
              <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 text-sm border border-[#e0ddd6] rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-[#2d9b6f] focus:border-transparent
                           placeholder:text-[#bbb] transition"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-[#1a6b4a] text-white py-2.5 rounded-lg text-sm font-medium
                         hover:bg-[#2d9b6f] transition-colors
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center mt-4">
            <Link href="/forgot-password" className="text-sm text-[#2d9b6f] hover:underline">
              Forgot your password?
            </Link>
          </p>

          <p className="text-center text-sm text-[#6b6b6b] mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#2d9b6f] font-medium hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
