import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const userId  = session!.user!.id;

  const invoices = await db.invoice.findMany({
    where:   { userId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  type InvoiceRow = (typeof invoices)[number];

  const totalRevenue = invoices
    .filter((inv: InvoiceRow) => inv.status === "PAID")
    .reduce((sum: number, inv: InvoiceRow) => sum + inv.total, 0);

  const pendingAmount = invoices
    .filter((inv: InvoiceRow) => inv.status === "SENT")
    .reduce((sum: number, inv: InvoiceRow) => sum + inv.total, 0);

  const overdueCount = invoices.filter((inv: InvoiceRow) => inv.status === "OVERDUE").length;

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="p-4 sm:p-6 md:p-10">

      {/* ---- PAGE HEADER ---- */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">
            Good morning, {session!.user!.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-[#6b6b6b] mt-1">
            Here&apos;s your invoice overview
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="bg-[#1a6b4a] text-white text-sm font-medium px-5 py-2.5 rounded-lg
                     hover:bg-[#2d9b6f] transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      {/* ---- STAT CARDS ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#e0ddd6] rounded-xl p-5">
          <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-[#1a1a1a]">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-[#aaa] mt-1">From paid invoices</p>
        </div>
        <div className="bg-white border border-[#e0ddd6] rounded-xl p-5">
          <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-1">Pending</p>
          <p className="text-2xl font-semibold text-blue-600">{formatCurrency(pendingAmount)}</p>
          <p className="text-xs text-[#aaa] mt-1">Awaiting payment</p>
        </div>
        <div className="bg-white border border-[#e0ddd6] rounded-xl p-5">
          <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-1">Overdue</p>
          <p className="text-2xl font-semibold text-red-500">{overdueCount}</p>
          <p className="text-xs text-[#aaa] mt-1">
            {overdueCount === 0 ? "All clear!" : "Needs attention"}
          </p>
        </div>
      </div>

      {/* ---- RECENT INVOICES ---- */}
      <div className="bg-white border border-[#e0ddd6] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0ddd6]">
          <h2 className="font-medium text-[#1a1a1a] text-sm">Recent Invoices</h2>
          <Link href="/invoices" className="text-xs text-[#2d9b6f] hover:underline">
            View all →
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-[#6b6b6b] text-sm mb-1">No invoices yet</p>
            <p className="text-[#aaa] text-xs mb-5">Create your first invoice to get started</p>
            <Link
              href="/invoices/new"
              className="inline-block bg-[#1a6b4a] text-white text-sm px-4 py-2 rounded-lg
                         hover:bg-[#2d9b6f] transition-colors"
            >
              Create Invoice
            </Link>
          </div>
        ) : (
          <div>
            {recentInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center gap-4 px-6 py-4 border-b border-[#e0ddd6] last:border-0
                           hover:bg-[#f9f8f6] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a]">{invoice.invoiceNo}</p>
                  <p className="text-xs text-[#6b6b6b] truncate">{invoice.client.name}</p>
                </div>
                <p className="text-xs text-[#6b6b6b] hidden sm:block">
                  Due {formatDate(invoice.dueDate)}
                </p>
                <p className="text-sm font-medium text-[#1a1a1a]">
                  {formatCurrency(invoice.total)}
                </p>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="text-xs text-[#2d9b6f] hover:underline shrink-0"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
