// ============================================================
// app/(app)/invoices/import/page.tsx — Import Invoices Page
//
// Server component wrapper that sets page metadata and renders
// the ImportForm client component.
//
// The actual two-step import logic (file upload → preview → create)
// lives in ImportForm.tsx and app/actions/import.ts.
//
// Route: /invoices/import (protected by the (app) layout auth guard)
// ============================================================

import ImportForm from "./ImportForm";

export const metadata = { title: "Import Invoices" };

export default function ImportPage() {
  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Import Invoices</h1>
        <p className="text-sm text-[#6b6b6b] mt-1">
          Upload a CSV, Excel, or PDF file to import invoices in bulk.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
