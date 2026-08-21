import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopClient } from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop All  Tops, Bottoms, Dresses & More",
  description:
    "Browse all campus fashion for FUNAAB students. Filter by tops, bottoms, dresses, hoodies, footwear and accessories.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopClient />
    </Suspense>
  );
}

function ShopSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="h-12 w-48 rounded-xl bg-[rgba(201,146,42,0.08)] animate-pulse mb-8" />
      <div className="flex gap-2 mb-8 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-[rgba(201,146,42,0.08)] animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="luxury-card overflow-hidden">
            <div className="bg-[rgba(201,146,42,0.08)] animate-pulse" style={{ aspectRatio: "4/5" }} />
            <div className="p-4 space-y-2">
              <div className="h-3 w-16 rounded bg-[rgba(201,146,42,0.1)] animate-pulse" />
              <div className="h-4 w-full rounded bg-[rgba(201,146,42,0.1)] animate-pulse" />
              <div className="h-5 w-24 rounded bg-[rgba(201,146,42,0.15)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
