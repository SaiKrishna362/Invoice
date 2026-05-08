// ============================================================
// app/not-found.tsx — Branded 404 Page
//
// Rendered automatically by Next.js whenever a route returns
// notFound() or the URL doesn't match any route.
// ============================================================

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] px-4">
      <div className="text-center max-w-sm">
        {/* Logo */}
        <Link href="/" className="text-2xl font-semibold tracking-tight text-[#1a1a1a] inline-block mb-8">
          tulluri<span className="text-[#2d9b6f]">.</span>
        </Link>

        {/* Error code */}
        <p className="text-8xl font-bold text-[#1a6b4a] leading-none mb-4">404</p>

        {/* Message */}
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-2">Page not found</h1>
        <p className="text-sm text-[#6b6b6b] mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="bg-[#1a6b4a] text-white text-sm font-medium px-6 py-2.5 rounded-lg
                       hover:bg-[#2d9b6f] transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="border border-[#e0ddd6] text-[#6b6b6b] text-sm font-medium px-6 py-2.5
                       rounded-lg hover:bg-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
