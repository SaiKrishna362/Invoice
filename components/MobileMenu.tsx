"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/invoices",  label: "Invoices"  },
  { href: "/clients",   label: "Clients"   },
];

export function MobileMenu({ userName }: { userName?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg text-[#6b6b6b] hover:bg-[#f5f4f0] transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-[#e0ddd6] shadow-md z-50">
          <div className="px-4 py-3 space-y-0.5">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center px-3 py-2.5 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]
                           hover:bg-[#f5f4f0] rounded-lg transition-colors"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2.5 text-sm text-[#6b6b6b] hover:text-[#1a1a1a]
                         hover:bg-[#f5f4f0] rounded-lg transition-colors"
            >
              {userName ?? "Profile"}
            </Link>
            <div className="px-3 py-2.5 border-t border-[#e0ddd6] mt-1 pt-3">
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
