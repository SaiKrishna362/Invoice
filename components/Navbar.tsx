// ============================================================
// components/Navbar.tsx — Top Navigation Bar
//
// Server component rendered by app/(app)/layout.tsx.
// Renders two layouts using Tailwind responsive classes:
//   Desktop (md+) — logo | nav links | user name link + sign-out
//   Mobile (<md)  — logo | hamburger → MobileMenu (client component)
//
// NAV_LINKS defines the shared navigation items used by both
// the desktop nav and the MobileMenu dropdown.
// ============================================================

import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { MobileMenu } from "./MobileMenu";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/invoices",  label: "Invoices"  },
  { href: "/clients",   label: "Clients"   },
];

/**
 * Top navigation bar shown on all authenticated pages.
 *
 * @param userName  The logged-in user's name, shown as a link to /profile.
 *                  Falls back to "Profile" if not yet loaded.
 */
export function Navbar({ userName }: { userName?: string | null }) {
  return (
    <nav className="relative bg-white border-b border-[#e0ddd6] px-5 py-3 flex items-center">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="text-lg font-semibold tracking-tight text-[#1a1a1a] shrink-0 mr-6"
      >
        tulluri<span className="text-[#2d9b6f]">.</span>
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-1 flex-1">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-1.5 text-sm text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#f5f4f0]
                       rounded-lg transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Desktop right side */}
      <div className="hidden md:flex items-center gap-4 shrink-0 ml-auto">
        <Link
          href="/profile"
          className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
        >
          {userName ?? "Profile"}
        </Link>
        <SignOutButton />
      </div>

      {/* Mobile hamburger */}
      <div className="md:hidden ml-auto">
        <MobileMenu userName={userName} />
      </div>
    </nav>
  );
}
