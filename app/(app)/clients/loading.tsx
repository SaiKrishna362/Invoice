// Skeleton shown while the clients server component fetches data
export default function ClientsLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-10 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 w-28 bg-[#e0ddd6] rounded-lg mb-1.5" />
          <div className="h-3.5 w-40 bg-[#f0ede8] rounded" />
        </div>
        <div className="h-9 w-28 bg-[#e0ddd6] rounded-lg" />
      </div>

      {/* Client cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white border border-[#e0ddd6] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="h-5 w-36 bg-[#e0ddd6] rounded" />
              <div className="h-7 w-7 bg-[#f0ede8] rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-48 bg-[#f0ede8] rounded" />
              <div className="h-3.5 w-32 bg-[#f0ede8] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
