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
  bottoms: (
    // Baggy jeans
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      <path
        d="M20 18 L22 42 L32 42 L40 62 L48 42 L58 42 L60 18Z"
        fill="#5b7fc4"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M20 18 L60 18" stroke="#c9922a" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 18 L40 42" stroke="#c9922a" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" />
      <path d="M25 22 L55 22" stroke="rgba(201,146,42,0.5)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  dresses: (
    // Flowy dress
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      <path
        d="M32 16 C32 16 30 20 30 24 L22 62 L58 62 L50 24 C50 20 48 16 48 16"
        fill="#e8b4d0"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 16 Q40 20 48 16"
        fill="none"
        stroke="#c9922a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="40" cy="16" rx="8" ry="3" fill="none" stroke="#c9922a" strokeWidth="1.5" />
      <path d="M28 38 Q40 42 52 38" stroke="rgba(201,146,42,0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  ),
  outerwear: (
    // Varsity jacket
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
  hoodies: (
    // Pullover hoodie SVG
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      <path
        d="M22 24 L16 34 L26 38 L26 60 L54 60 L54 38 L64 34 L58 24 C55 28 50 30 40 30 C30 30 25 28 22 24Z"
        fill="#3d3d3d"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M34 24 C35 22 37 20 40 20 C43 20 45 22 46 24"
        fill="none"
        stroke="#c9922a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="40" cy="24" rx="6" ry="4" fill="#2a2a2a" stroke="#c9922a" strokeWidth="1" />
      <path d="M34 40 L46 40" stroke="rgba(201,146,42,0.4)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  joggers: (
    // Jogger sweatpants
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      <path
        d="M22 20 L22 46 L34 46 L38 64 L42 64 L46 46 L58 46 L58 20Z"
        fill="#4a4a4a"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M22 20 L58 20" stroke="#c9922a" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 26 L58 26" stroke="rgba(201,146,42,0.3)" strokeWidth="1" strokeLinecap="round" />
      <path d="M40 20 L40 46" stroke="rgba(201,146,42,0.4)" strokeWidth="1" strokeLinecap="round" strokeDasharray="3 2" />
      {/* Cuff at bottom */}
      <path d="M34 60 L38 60" stroke="#c9922a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M42 60 L46 60" stroke="#c9922a" strokeWidth="1.5" strokeLinecap="round" />
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
  longsleeves: (
    // Long-sleeve top with cuffs
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      {/* Body */}
      <path
        d="M28 22 L28 58 L52 58 L52 22"
        fill="white"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Left long sleeve extending down */}
      <path
        d="M28 22 L20 24 L14 48 L20 50 L26 28 L28 30"
        fill="white"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Right long sleeve extending down */}
      <path
        d="M52 22 L60 24 L66 48 L60 50 L54 28 L52 30"
        fill="white"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Collar */}
      <path
        d="M28 22 Q34 26 40 26 Q46 26 52 22"
        fill="none"
        stroke="#c9922a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Left cuff */}
      <path d="M14 48 L20 50" stroke="#c9922a" strokeWidth="2" strokeLinecap="round" />
      {/* Right cuff */}
      <path d="M66 48 L60 50" stroke="#c9922a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  accessories: (
    // Chain necklace
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="80" rx="16" fill="rgba(201,146,42,0.08)" />
      <path
        d="M20 30 Q40 20 60 30"
        fill="none"
        stroke="#c9922a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 30 Q18 40 26 50 Q33 58 40 60 Q47 58 54 50 Q62 40 60 30"
        fill="none"
        stroke="#c9922a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Pendant */}
      <circle cx="40" cy="60" r="6" fill="#e8b84b" stroke="#c9922a" strokeWidth="1.5" />
      <text x="40" y="64" textAnchor="middle" fontSize="7" fill="#1a0e00" fontWeight="bold">✦</text>
      {/* Chain links detail */}
      {[28, 36, 44, 52].map((x, i) => (
        <ellipse
          key={i}
          cx={x}
          cy={26 + Math.sin(i) * 2}
          rx="2.5"
          ry="1.5"
          fill="none"
          stroke="#e8b84b"
          strokeWidth="1"
          transform={`rotate(${i * 20} ${x} ${26 + Math.sin(i) * 2})`}
        />
      ))}
    </svg>
  ),
};

export function CategoryCard({ id, label, description }: CategoryCardProps) {
  return (
    <Link
      href={`/shop?category=${id}`}
      className="luxury-card flex flex-col items-center p-5 text-center group cursor-pointer hover:border-[var(--gold-primary)] transition-all duration-300"
      aria-label={`Shop ${label} — ${description}`}
    >
      {/* Icon */}
      <div
        className="relative w-20 h-20 mb-4 rounded-2xl overflow-hidden transition-transform duration-300 group-hover:scale-110"
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
