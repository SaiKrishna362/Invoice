"use client";

import { useState } from "react";
import { NavLink } from "./NavLink";
import { SignOutButton } from "./SignOutButton";

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
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
              <div className="w-8 h-8 rounded-full bg-[#e8f5ee] flex items-center justify-center shrink-0">
                <span className="text-[#1a6b4a] text-xs font-semibold">
                  {(userName ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-[#1a1a1a] truncate">
                {userName ?? "Account"}
              </span>
            </div>
            <div className="border-t border-[#e0ddd6] pt-2">
              <div className="px-3 py-1">
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
