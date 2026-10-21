import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
    // Free-tier cost control: Supabase storage serves images with
    // `Cache-Control: no-cache`, so without a minimum TTL every product page
    // view re-ran the optimizer function (download the original → decode →
    // encode across all widths), which alone burned the whole Vercel Hobby
    // quota. Uploaded filenames are unique per upload (immutable URLs), so
    // transformed variants can be cached safely for a long time.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // WebP only: AVIF encoding is by far the slowest, most CPU-heavy part of
    // the optimizer, and every browser in use on campus decodes WebP fine.
    formats: ["image/webp"],
    // Fewer generated widths per image → fewer variants to encode and cache.
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [160, 320, 480, 640, 768],
  },
};

export default nextConfig;
