// Loading placeholders that match ProductCard proportions, shown while the
// real catalogue is being fetched (so no demo/stale products ever flash).
export function ProductCardSkeleton() {
  return (
    <div className="luxury-card overflow-hidden flex-col h-full animate-pulse" aria-hidden="true">
      <div style={{ aspectRatio: "4/5", background: "rgba(201,146,42,0.08)" }} />
      <div className="p-4 space-y-2">
        <div className="h-3 w-1/3 rounded-full" style={{ background: "rgba(201,146,42,0.14)" }} />
        <div className="h-4 w-3/4 rounded-full" style={{ background: "rgba(201,146,42,0.12)" }} />
        <div className="h-3 w-1/2 rounded-full" style={{ background: "rgba(201,146,42,0.1)" }} />
        <div className="h-5 w-1/4 rounded-full mt-3" style={{ background: "rgba(201,146,42,0.16)" }} />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 8,
  className = "grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
