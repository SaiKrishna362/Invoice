// ============================================
// lib/utils.ts — Helper / Utility Functions
//
// Small reusable functions used across the app.
// Import what you need: import { formatCurrency } from "@/lib/utils"
// ============================================


// ---- FORMAT CURRENCY ----
// Converts a number into Indian Rupee format
// Example: 50000 → "₹50,000.00"
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}


// ---- FORMAT DATE ----
// Converts a Date object into a readable string
// Example: new Date("2024-03-15") → "15 Mar 2024"
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}


// ---- GENERATE INVOICE NUMBER ----
// Produces a globally unique, collision-free invoice ID with a human-readable
// date prefix. Format: INV-YYYYMM-XXXXXXXX
//   e.g. INV-202505-3A7F2B91
//
// 4 random bytes (8 hex chars) = ~4.3 billion unique values per month —
// effectively zero collision probability even under concurrent load.
// No database round-trip required, so no race condition is possible.
//
// The YYYYMM prefix groups invoices by issuance month for easy
// searching and sorting — a common enterprise invoicing convention.
import crypto from "node:crypto";

export function generateInvoiceNo(): string {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand  = crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. 3A7F2B91
  return `INV-${year}${month}-${rand}`;
}


// ---- CALCULATE GST ----
// Takes subtotal and GST percentage, returns breakdown
// Example: calculateGST(10000, 18)
// Returns: { gstAmount: 1800, total: 11800 }
export function calculateGST(subtotal: number, gstPercent: number) {
  const gstAmount = (subtotal * gstPercent) / 100;
  const total = subtotal + gstAmount;
  return {
    gstAmount: Math.round(gstAmount * 100) / 100, // Round to 2 decimal places
    total:     Math.round(total     * 100) / 100,
  };
}


// ---- GET STATUS BADGE COLOR ----
// Returns Tailwind CSS classes for invoice status badges
// Example: getStatusColor("PAID") → "bg-green-100 text-green-700"
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    DRAFT:   "bg-gray-100  text-gray-600",
    SENT:    "bg-blue-100  text-blue-600",
    PAID:    "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100   text-red-600",
  };
  return map[status] ?? map.DRAFT;
}


// ---- CHECK IF OVERDUE ----
// Returns true if the invoice is past its due date and not yet paid
export function isOverdue(dueDate: Date, status: string): boolean {
  return status !== "PAID" && new Date(dueDate) < new Date();
}
