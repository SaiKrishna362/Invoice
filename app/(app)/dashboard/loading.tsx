// Skeleton shown while the dashboard server component fetches data
export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-10 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-7 w-48 bg-[#e0ddd6] rounded-lg" />
        <div className="h-9 w-32 bg-[#e0ddd6] rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-[#e0ddd6] rounded-2xl p-5">
            <div className="h-3 w-20 bg-[#e0ddd6] rounded mb-3" />
            <div className="h-7 w-28 bg-[#e0ddd6] rounded" />
          </div>
        ))}
      </div>

      {/* Recent invoices */}
      <div className="bg-white border border-[#e0ddd6] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e0ddd6]">
          <div className="h-4 w-36 bg-[#e0ddd6] rounded" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-[#e0ddd6] last:border-0 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-3.5 w-24 bg-[#e0ddd6] rounded" />
              <div className="h-3 w-32 bg-[#f0ede8] rounded" />
            </div>
            <div className="h-6 w-16 bg-[#e0ddd6] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
