"use client";

import { useState } from "react";
import { NavLink } from "@/components/NavLink";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
];

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#e0ddd6]">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center">

        {/* Logo */}
        <NavLink href="/" className="text-lg font-semibold tracking-tight text-[#1a1a1a] shrink-0 mr-8">
          tulluri<span className="text-[#2d9b6f]">.</span>
        </NavLink>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-3 py-1.5 text-sm text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f5f4f0]
                         rounded-lg transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3 ml-auto shrink-0">
          <NavLink
            href="/login"
            className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] px-4 py-2 rounded-lg
                       hover:bg-[#f5f4f0] transition-colors"
          >
            Log in
          </NavLink>
          <NavLink
            href="/signup"
            className="text-sm font-medium bg-[#1a6b4a] text-white px-4 py-2 rounded-lg
                       hover:bg-[#2d9b6f] transition-colors"
          >
            Get started free
          </NavLink>
        </div>

        {/* Mobile: login button + hamburger */}
        <div className="md:hidden ml-auto flex items-center gap-2">
          <NavLink
            href="/login"
            className="text-sm text-[#6b6b6b] px-3 py-1.5 rounded-lg hover:bg-[#f5f4f0] transition-colors"
          >
            Log in
          </NavLink>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-lg hover:bg-[#f5f4f0] transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#e0ddd6] bg-white px-5 py-4 space-y-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f5f4f0]
                         rounded-lg transition-colors"
            >
              {label}
            </a>
          ))}
          <div className="pt-2 border-t border-[#e0ddd6] mt-2">
            <NavLink
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="block w-full text-center text-sm font-medium bg-[#1a6b4a] text-white
                         px-4 py-2.5 rounded-lg hover:bg-[#2d9b6f] transition-colors"
            >
              Get started free
            </NavLink>
          </div>
        </div>
      )}
    </nav>
  );
}
