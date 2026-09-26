import Link from "next/link";
import { Category } from "@/lib/types";

interface CategoryCardProps {
  id: Category;
  label: string;
  description: string;
}

// Elegant monochrome line icons. Stroked with `currentColor` so they pick up
// the gold accent in both light and dark mode, and stay visually consistent
// across all six categories.
const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  tops: (
    // Crew-neck tee
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path
        d="M27 20 L18 26 L23 35 L29 32 L29 62 L51 62 L51 32 L57 35 L62 26 L53 20 C50 25 45 27 40 27 C35 27 30 25 27 20 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M27 20 C30 25 35 27 40 27 C45 27 50 25 53 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  "jackets-hoodies": (
    // Hooded sweatshirt with drawstrings and pouch pocket
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path
        d="M24 26 L20 32 L26 36 L26 62 L54 62 L54 36 L60 32 L56 26 L48 30 L40 32 L32 30 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M32 30 C32 24 36 21 40 21 C44 21 48 24 48 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M37 32 L36 41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M43 32 L44 41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M32 52 L48 52 L46 60 L34 60 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  "trousers-jeans": (
    // Waistband trousers with crease
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path
        d="M26 18 L54 18 L56 42 L54 64 L44 64 L40 40 L36 64 L26 64 L24 42 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M26 25 L54 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 18 L40 40" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M30 30 L30 58" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <path d="M50 30 L50 58" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
    </svg>
  ),
  footwear: (
    // Side-profile sneaker with laces and sole
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path
        d="M16 50 L16 46 C16 43 18 41 21 40 L30 37 L40 32 C43 30 47 31 49 34 L53 41 L60 44 C63 45 64 48 63 51 L62 53 L18 53 C17 53 16 52 16 50 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M16 55 Q40 59 62 55 L62 58 Q40 62 16 58 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M31 41 L39 36" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M34 45 L42 40" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  "watches-accessories": (
    // Wristwatch with crown
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M31 15 L49 15 L47 28 L33 28 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M33 52 L47 52 L49 65 L31 65 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="40" cy="40" r="15" stroke="currentColor" strokeWidth="2" />
      <circle cx="40" cy="40" r="10" stroke="currentColor" strokeWidth="1.4" />
      <path d="M40 40 L40 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 40 L45 41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="40" r="1.4" fill="currentColor" />
      <path d="M55 37 L58 37 L58 43 L55 43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  "corporate-dresses": (
    // Sheath dress with belt
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M33 16 L47 16 L49 31 L31 31 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M33 16 Q40 22 47 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M31 31 L49 31 L54 64 L26 64 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M31 37 L49 37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 37 L40 64" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
    </svg>
  ),
};

export function CategoryCard({ id, label, description }: CategoryCardProps) {
  return (
    <Link
      href={`/shop?category=${id}`}
      className="luxury-card flex flex-col items-center p-5 text-center group cursor-pointer h-full hover:border-[var(--gold-primary)] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[var(--gold-primary)] outline-none"
      aria-label={`Shop ${label}: ${description}`}
    >
      {/* Icon */}
      <div
        className="category-icon-tile relative w-20 h-20 mb-4 rounded-2xl flex items-center justify-center p-3.5 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3"
      >
        {CATEGORY_ICONS[id]}
      </div>

      {/* Label */}
      <h3
        className="font-bold text-sm mb-1 group-hover:text-[var(--gold-primary)] transition-colors"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </h3>

      {/* Description */}
      <p
        className="text-[11px] leading-snug"
        style={{ color: "var(--text-muted)" }}
      >
        {description}
      </p>
    </Link>
  );
}
