// ============================================================
// hooks/useUnsavedChanges.ts — Unsaved Changes Guard
//
// Prevents accidental data loss when the user tries to leave a page
// that has unsaved form edits. Three navigation paths are intercepted:
//
//   1. Browser close / tab close / refresh
//      → Native browser dialog via `beforeunload` (cannot be customised).
//
//   2. In-app link clicks / router.push() calls
//      → We monkey-patch window.history.pushState so Next.js's client
//        router goes through our guard before changing the URL.
//
//   3. Browser back / forward buttons
//      → `popstate` fires after the URL has already changed, so we
//        immediately call window.history.go(1) to undo the navigation,
//        then show our modal and re-run the navigation if confirmed.
//
// Usage:
//   const { showPrompt, proceedNavigation, cancelNavigation, clearDirty }
//     = useUnsavedChanges(isDirty);
//
//   Render <UnsavedChangesModal> conditionally on showPrompt.
//   Call clearDirty() synchronously before any programmatic router.push()
//   so that the guard does not fire on intentional navigation (e.g. success redirect).
// ============================================================

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Guards all navigation when `isDirty` is true.
 *
 * @param isDirty  True while the form has unsaved edits.
 * @returns        showPrompt — whether to render the confirmation modal
 *                 proceedNavigation — call when user clicks "Leave anyway"
 *                 cancelNavigation  — call when user clicks "Stay on page"
 *                 clearDirty        — call before intentional navigation to suppress the guard
 */
export function useUnsavedChanges(isDirty: boolean) {
  const [showPrompt, setShowPrompt] = useState(false);

  // Holds the deferred navigation fn to run if the user confirms.
  const pendingFn = useRef<(() => void) | null>(null);

  // Ref mirror of isDirty so event handlers always see the latest value
  // without needing to be re-registered every render.
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  // Prevents double-firing: when we call history.go(1) to undo a popstate,
  // that itself fires another popstate event which we must ignore.
  const handlingPop = useRef(false);

  // ── 1. Block browser close / refresh ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      // returnValue is required for Chrome to show the native dialog.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── 2. Intercept pushState (Next.js router) + 3. Back/forward ─────────────
  useEffect(() => {
    const origPush = window.history.pushState.bind(window.history);

    // Wrap pushState so in-app navigation triggers our modal.
    window.history.pushState = function (...args: Parameters<typeof origPush>) {
      if (!isDirtyRef.current) {
        origPush(...args);
        return;
      }
      pendingFn.current = () => origPush(...args);
      setShowPrompt(true);
    };

    const onPopState = () => {
      // Ignore the synthetic popstate we fire ourselves when restoring state.
      if (handlingPop.current) {
        handlingPop.current = false;
        return;
      }
      if (!isDirtyRef.current) return;

      // Undo the back/forward navigation immediately, then ask the user.
      handlingPop.current = true;
      window.history.go(1);
      pendingFn.current = () => window.history.go(-1);
      setShowPrompt(true);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      // Restore the original pushState when the component unmounts.
      window.history.pushState = origPush;
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  /** User clicked "Leave anyway" — run the deferred navigation. */
  function proceedNavigation() {
    setShowPrompt(false);
    const fn = pendingFn.current;
    pendingFn.current = null;
    fn?.();
  }

  /** User clicked "Stay on page" — discard the deferred navigation. */
  function cancelNavigation() {
    setShowPrompt(false);
    pendingFn.current = null;
  }

  /**
   * Synchronously clears the dirty ref so that the guard does NOT fire
   * on the success redirect after a form submit.
   * Call this immediately before calling router.push() / router.replace().
   */
  function clearDirty() {
    isDirtyRef.current = false;
  }

  return { showPrompt, proceedNavigation, cancelNavigation, clearDirty };
}
