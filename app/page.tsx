import { Suspense } from "react";
import { HeroSection } from "@/components/HeroSection";
import { CategorySection } from "@/components/CategorySection";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { PromoBar } from "@/components/PromoBar";

export default function HomePage() {
  return (
    <>
      <PromoBar />
      <HeroSection />
      <CategorySection />
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProducts />
      </Suspense>
    </>
  );
}

function FeaturedProductsSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="h-8 w-48 rounded-full bg-[rgba(201,146,42,0.15)] animate-pulse mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
    </section>
  );
}
