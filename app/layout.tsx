// ============================================
// app/layout.tsx — Root Layout
//
// This file wraps EVERY page in the app.
// It sets up:
//   - Font (DM Sans from Google Fonts)
//   - Page metadata (title, description for SEO)
//   - SessionProvider (so all pages can access login state)
//
// ⚠️  REPLACE the existing layout.tsx with this file
// ============================================

import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "./providers";
import { NavigationProvider } from "@/components/NavigationProgress";

// Load DM Sans font — only Latin characters for faster load
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// SEO metadata — appears in Google search results and browser tab
export const metadata: Metadata = {
  title: {
    default:  "Tulluri — GST Invoicing for Indian Freelancers",
    template: "%s | Tulluri",
  },
  description:
    "Create professional GST-ready invoices in under 60 seconds. Free for Indian freelancers.",
  openGraph: {
    title:       "Tulluri — GST Invoicing for Indian Freelancers",
    description: "Create professional GST-ready invoices in under 60 seconds. Free for Indian freelancers.",
    type:        "website",
    locale:      "en_IN",
  },
  robots: {
    index:  true,
    follow: true,
  },
};

// Viewport configuration — controls the browser chrome on mobile
export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  themeColor:   "#1a6b4a",            // Android Chrome / Safari status bar colour
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={dmSans.className}>
        {/*
          SessionProvider wraps everything so any page or component
          can call useSession() to get the logged-in user's info
        */}
        <SessionProvider>
          <NavigationProvider>{children}</NavigationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
