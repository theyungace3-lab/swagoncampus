import type { CSSProperties } from "react";
import { useId } from "react";

interface BrandMarkProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * The SwagOnCampus mark, drawn inline so it stays crisp at any size and needs
 * no network request. Mirrors the asset in scripts/brand-assets.cjs.
 */
export function BrandMark({ size = 28, className = "", style }: BrandMarkProps) {
  // SVG gradient ids must be unique per instance on the page.
  const gid = `bm-gold-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d78e" />
          <stop offset="0.45" stopColor="#e8b84b" />
          <stop offset="1" stopColor="#8b6314" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="17" fill={`url(#${gid})`} />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="15.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.30"
        strokeWidth="1.5"
      />

      {/* Bag handle */}
      <path
        d="M24.5 26 v-3.2 a7.5 7.5 0 0 1 15 0 V26"
        fill="none"
        stroke="#1a0e00"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* Bag body */}
      <path
        d="M17.5 26.5 h29 l3 22.5 q0.6 5.5 -5 5.5 h-25 q-5.6 0 -5 -5.5 z"
        fill="#1a0e00"
      />
      {/* S tag */}
      <text
        x="32"
        y="44.5"
        fontFamily="Arial, sans-serif"
        fontWeight="900"
        fontSize="17"
        textAnchor="middle"
        fill={`url(#${gid})`}
      >
        S
      </text>
    </svg>
  );
}
