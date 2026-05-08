// Skeleton shown while the invoices list server component fetches data
export default function InvoicesLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-10 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-[#e0ddd6] rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-[#e0ddd6] rounded-lg" />
          <div className="h-9 w-20 bg-[#e0ddd6] rounded-lg" />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-white border border-[#e0ddd6] rounded-xl p-1 w-max mb-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-7 w-16 bg-[#f0ede8] rounded-lg" />
        ))}
      </div>

      {/* Invoice rows */}
      <div className="bg-white border border-[#e0ddd6] rounded-2xl overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-[#e0ddd6] last:border-0 flex items-center justify-between">
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-28 bg-[#e0ddd6] rounded" />
              <div className="h-3 w-40 bg-[#f0ede8] rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-3.5 w-20 bg-[#f0ede8] rounded hidden sm:block" />
              <div className="h-6 w-16 bg-[#e0ddd6] rounded-full" />
              <div className="h-4 w-4 bg-[#e0ddd6] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
