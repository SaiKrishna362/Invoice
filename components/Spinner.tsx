// ============================================================
// components/Spinner.tsx — Inline Loading Spinner
//
// Lightweight animated SVG spinner for use inside buttons and
// other UI elements during async operations.
//
// Usage inside a button:
//   <button className="flex items-center justify-center gap-2 ...">
//     {pending && <Spinner />}
//     {pending ? "Saving…" : "Save"}
//   </button>
//
// Size is controlled by the className prop (default w-4 h-4).
// Color inherits from the parent element via currentColor.
// ============================================================

/**
 * Animated SVG spinner. Inherits color from the surrounding text.
 *
 * @param className  Tailwind size classes — defaults to "w-4 h-4"
 */
export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {/* Track circle — faint */}
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      {/* Spinning arc — visible */}
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
