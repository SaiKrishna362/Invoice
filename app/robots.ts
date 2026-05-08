// ============================================================
// app/robots.ts — Crawl rules for search engines
//
// Allows indexing of public marketing pages (/, /login, /signup)
// but blocks crawlers from authenticated sections so private
// invoice data is never indexed.
// ============================================================

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://tulluri.in";

  return {
    rules: [
      {
        // Allow bots to index public pages only
        userAgent: "*",
        allow:  ["/", "/login", "/signup", "/forgot-password"],
        disallow: [
          "/dashboard",
          "/invoices",
          "/clients",
          "/profile",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
