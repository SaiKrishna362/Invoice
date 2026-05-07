// ============================================================
// components/SignOutButton.tsx — Sign Out Button with Confirm
//
// Client component used in both Navbar (desktop) and MobileMenu.
// Shows "Sign out" as a text button. Clicking it opens a small
// confirmation modal before actually calling logoutAction, which
// prevents accidental sign-outs.
//
// logoutAction calls Auth.js signOut() server-side and redirects
// the browser to /login.
// ============================================================

"use client";

import { useState, useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Spinner } from "@/components/Spinner";

export function SignOutButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-[#6b6b6b] hover:text-[#1a1a1a] transition-colors"
      >
        Sign out
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-[#1a1a1a] mb-1">Sign out?</h2>
            <p className="text-sm text-[#6b6b6b] mb-6">
              Are you sure you want to sign out of Tulluri?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex-1 border border-[#e0ddd6] text-sm text-[#1a1a1a] py-2.5 rounded-lg
                           hover:bg-[#f5f4f0] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => startTransition(() => logoutAction())}
                disabled={pending}
                className="flex-1 bg-red-500 text-white text-sm py-2.5 rounded-lg
                           hover:bg-red-600 transition-colors disabled:opacity-50
                           flex items-center justify-center gap-2"
              >
                {pending && <Spinner />}
                {pending ? "Signing out…" : "Yes, sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
