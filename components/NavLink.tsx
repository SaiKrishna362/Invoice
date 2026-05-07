// ============================================================
// components/NavLink.tsx — Navigation Link with Loading Spinner
//
// Drop-in replacement for Next.js <Link> in client components.
// Uses router.push() wrapped in useTransition so the spinner is
// visible from click until the new page finishes rendering.
//
// Modifier-key clicks (Ctrl / Cmd / Shift / Alt) are passed through
// to the browser unchanged so "open in new tab" still works.
//
// Usage:
//   <NavLink href="/invoices" className="...">Invoices</NavLink>
// ============================================================

"use client";

import { useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/components/NavigationProgress";

/**
 * An anchor element that shows a spinner while the target page is loading.
 *
 * @param href       Destination URL (internal routes only)
 * @param className  Tailwind classes applied to the anchor
 * @param spinnerClassName  Size override for the spinner (default w-3.5 h-3.5)
 * @param onClick    Optional extra callback (e.g. close mobile menu)
 * @param children   Link content
 */
export function NavLink({
  href,
  className = "",
  onClick,
  children,
}: {
  href: string;
  className?: string;
  spinnerClassName?: string; // kept for backwards-compat, no longer used
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { setNavigating } = useNavigation();

  // Hide the overlay when this link's transition finishes (covers both push and refresh).
  useEffect(() => {
    if (!isPending) setNavigating(false);
  }, [isPending, setNavigating]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Let the browser handle modifier-key clicks (open in new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClick?.();
    setNavigating(true);
    // Read the current URL at click time — avoids useSearchParams() which
    // de-opts every route that imports NavLink from static rendering.
    const currentUrl = window.location.pathname + window.location.search;
    startTransition(() => {
      if (href === currentUrl) {
        router.refresh();
      } else {
        router.push(href);
      }
    });
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 ${isPending ? "pointer-events-none" : ""} ${className}`}
    >
      {children}
    </a>
  );
}
