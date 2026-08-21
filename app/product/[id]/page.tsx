import { Suspense } from "react";
import { ProductDetailClient } from "./ProductDetailClient";

export default function ProductPage({ params }: PageProps<"/product/[id]">) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      {params.then(({ id }) => (
        <ProductDetailClient id={id} />
      ))}
    </Suspense>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div
          className="rounded-2xl animate-pulse"
          style={{ aspectRatio: "1", background: "rgba(201,146,42,0.08)" }}
        />
        <div className="space-y-4">
          {[80, 60, 40, 100, 60].map((w, i) => (
            <div
              key={i}
              className="h-5 rounded-full animate-pulse"
              style={{ width: `${w}%`, background: "rgba(201,146,42,0.1)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
