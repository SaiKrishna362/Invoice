import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { MobileMenu } from "./MobileMenu";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/invoices",  label: "Invoices"  },
  { href: "/clients",   label: "Clients"   },
];

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
