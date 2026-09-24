import Link from "next/link";
import { Category } from "@/lib/types";

interface CategoryCardProps {
  id: Category;
  label: string;
  description: string;
}

// SVG category illustrations — clothing-accurate icons
const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  tops: (
    // Plain white tee shirt
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      <path
        d="M24 22 L18 30 L28 34 L28 58 L52 58 L52 34 L62 30 L56 22 C53 26 47 28 40 28 C33 28 27 26 24 22Z"
        fill="white"
        stroke="#c9922a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M56 22 C53 26 47 28 40 28 C33 28 27 26 24 22"
        fill="none"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  "jackets-hoodies": (
    // Varsity jacket with hood hint
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      <path
        d="M22 22 L16 32 L26 36 L26 60 L54 60 L54 36 L64 32 L58 22 L50 26 L40 28 L30 26 Z"
        fill="#1a1a2e"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M40 28 L40 60" stroke="#c9922a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 26 C32 30 36 32 40 32" stroke="#e8b84b" strokeWidth="1" strokeLinecap="round" />
      <path d="M50 26 C48 30 44 32 40 32" stroke="#e8b84b" strokeWidth="1" strokeLinecap="round" />
      <rect x="28" y="38" width="6" height="4" rx="1" fill="#c9922a" />
    </svg>
  ),
  "trousers-jeans": (
    // Straight-leg trousers
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      <path
        d="M24 16 L56 16 L58 44 L56 64 L44 64 L40 42 L36 64 L24 64 L22 44 Z"
        fill="#4a6a9a"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M24 16 L56 16" stroke="#c9922a" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 16 L40 42" stroke="#c9922a" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M28 20 L52 20" stroke="rgba(201,146,42,0.5)" strokeWidth="1" strokeLinecap="round" />
      <path d="M28 30 L36 30" stroke="rgba(201,146,42,0.4)" strokeWidth="1" strokeLinecap="round" />
      <path d="M44 30 L52 30" stroke="rgba(201,146,42,0.4)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  footwear: (
    // Chunky sneaker
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      <path
        d="M14 52 C14 48 18 42 24 40 L36 36 L46 30 C50 28 54 30 56 34 L58 40 L64 42 C66 43 66 46 64 48 L64 52 C64 54 62 56 60 56 L18 56 C16 56 14 54 14 52Z"
        fill="white"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 52 L64 52"
        stroke="#c9922a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Sole */}
      <path
        d="M14 53 Q39 57 64 53 L64 56 Q39 60 14 56 Z"
        fill="#c9922a"
        stroke="none"
      />
      {/* Laces */}
      <path d="M30 44 L42 38" stroke="#c9922a" strokeWidth="1" strokeLinecap="round" />
      <path d="M32 47 L44 41" stroke="#c9922a" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  "watches-accessories": (
    // Wristwatch
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      {/* Straps */}
      <path d="M30 14 L50 14 L48 30 L32 30 Z" fill="#2a2a2a" stroke="#c9922a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M32 50 L48 50 L50 66 L30 66 Z" fill="#2a2a2a" stroke="#c9922a" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Case */}
      <circle cx="40" cy="40" r="15" fill="#e8b84b" stroke="#c9922a" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="11" fill="white" stroke="#c9922a" strokeWidth="1" />
      {/* Hands */}
      <path d="M40 40 L40 33" stroke="#1a0e00" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M40 40 L45 42" stroke="#1a0e00" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="40" cy="40" r="1.5" fill="#1a0e00" />
      {/* Crown */}
      <rect x="55" y="38" width="3" height="4" rx="1" fill="#c9922a" />
    </svg>
  ),
  "corporate-dresses": (
    // Formal dress
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      {/* Bodice */}
      <path
        d="M32 16 L48 16 L50 30 L30 30 Z"
        fill="#e8b4d0"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Skirt */}
      <path
        d="M30 30 L50 30 L56 62 L24 62 Z"
        fill="#f0cddc"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Neckline */}
      <path d="M32 16 Q40 21 48 16" fill="none" stroke="#c9922a" strokeWidth="1.5" strokeLinecap="round" />
      {/* Belt */}
      <path d="M30 30 L50 30" stroke="#c9922a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Seam detail */}
      <path d="M40 30 L40 62" stroke="rgba(201,146,42,0.4)" strokeWidth="1" strokeLinecap="round" />
      <path d="M30 44 Q40 47 50 44" stroke="rgba(201,146,42,0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
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
        className="relative w-20 h-20 mb-4 rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3"
        style={{
          filter: "drop-shadow(0 4px 8px rgba(201,146,42,0.2))",
        }}
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
