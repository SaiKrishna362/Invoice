// Skeleton shown while the profile server component fetches data
export default function ProfileLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-2xl animate-pulse">
      {/* Header */}
      <div className="h-7 w-24 bg-[#e0ddd6] rounded-lg mb-8" />

      {/* Profile card */}
      <div className="bg-white border border-[#e0ddd6] rounded-2xl p-6 space-y-5">
        {[...Array(5)].map((_, i) => (
          <div key={i}>
            <div className="h-3.5 w-24 bg-[#f0ede8] rounded mb-2" />
            <div className="h-10 w-full bg-[#f5f4f0] rounded-lg" />
          </div>
        ))}
        <div className="pt-2">
          <div className="h-10 w-32 bg-[#e0ddd6] rounded-lg" />
        </div>
      </div>
    </div>
  );
}
