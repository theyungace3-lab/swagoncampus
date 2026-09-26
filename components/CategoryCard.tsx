import Image from "next/image";
import Link from "next/link";
import { Category } from "@/lib/types";

interface CategoryCardProps {
  id: Category;
  label: string;
  description: string;
}

// Real category photos, stored in /public/categories and named after the category id.
const CATEGORY_IMAGES: Record<Category, string> = {
  tops: "/categories/tops.jpg",
  "jackets-hoodies": "/categories/jackets-hoodies.jpg",
  "trousers-jeans": "/categories/trousers-jeans.jpg",
  footwear: "/categories/footwear.jpg",
  "watches-accessories": "/categories/watches-accessories.jpg",
  "corporate-dresses": "/categories/corporate-dresses.jpg",
};

export function CategoryCard({ id, label, description }: CategoryCardProps) {
  const src = CATEGORY_IMAGES[id];

  return (
    <Link
      href={`/shop?category=${id}`}
      className="luxury-card group overflow-hidden flex flex-col h-full focus-visible:ring-2 focus-visible:ring-[var(--gold-primary)] outline-none"
      aria-label={`Shop ${label}: ${description}`}
    >
      {/* Photo */}
      <div className="relative w-full aspect-square overflow-hidden bg-[rgba(201,146,42,0.08)]">
        <Image
          src={src}
          alt={`${label}, ${description}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
        {/* Gold wash on hover */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "linear-gradient(180deg, rgba(26,14,0,0) 55%, rgba(201,146,42,0.35) 100%)" }}
          aria-hidden="true"
        />
      </div>

      {/* Caption */}
      <div className="p-4 text-center">
        <h3
          className="font-bold text-sm mb-1 group-hover:text-[var(--gold-primary)] transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </h3>
        <p
          className="text-[11px] leading-snug"
          style={{ color: "var(--text-muted)" }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}
