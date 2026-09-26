/**
 * SwagOnCampus brand asset generator.
 *
 * Re-runnable source of truth for every static brand asset:
 *   app/icon.svg                  favicon (SVG, crisp at any size)
 *   app/apple-icon.png            180x180 iOS home-screen icon
 *   app/opengraph-image.png       1200x630 Meta/Facebook share card
 *   app/twitter-image.png         1200x630 X/Twitter share card
 *   public/social/whatsapp-status.png  1080x1920 WhatsApp status / IG story
 *
 * Run from the project root:  node scripts/brand-assets.cjs
 * Requires sharp (ships with the Next.js image pipeline).
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();

// ── Brand tokens (mirror app/globals.css) ────────────────────────────────
const C = {
  goldPrimary: "#c9922a",
  goldLight: "#e8b84b",
  goldDark: "#8b6314",
  goldShine: "#f5d78e",
  brownDeep: "#1a0e00",
  brownMid: "#6b3d1e",
  cream: "#f5e8cc",
  tan: "#d4a96a",
  muted: "#9c7a5a",
  whatsapp: "#25D366",
};

// ── Reusable gold gradient ────────────────────────────────────────────────
const goldGradient = (id) => `
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.goldShine}"/>
      <stop offset="0.45" stop-color="${C.goldLight}"/>
      <stop offset="1" stop-color="${C.goldDark}"/>
    </linearGradient>`;

const goldFlat = (id) => `
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.goldDark}"/>
      <stop offset="0.5" stop-color="${C.goldLight}"/>
      <stop offset="1" stop-color="${C.goldDark}"/>
    </linearGradient>`;

const glow = (id) => `
    <radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.goldLight}" stop-opacity="0.5"/>
      <stop offset="0.55" stop-color="${C.goldLight}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${C.goldLight}" stop-opacity="0"/>
    </radialGradient>`;

/**
 * The brand mark, drawn in a 64x64 box: gold rounded square holding a dark
 * shopping bag with an "S" tag. Rendered inside <g transform="...scale()">.
 */
const mark = (gid) => `${goldGradient(gid)}
  <rect width="64" height="64" rx="17" fill="url(#${gid})"/>
  <rect x="1.5" y="1.5" width="61" height="61" rx="15.5" fill="none" stroke="#ffffff" stroke-opacity="0.30" stroke-width="1.5"/>
  <path d="M24.5 26 v-3.2 a7.5 7.5 0 0 1 15 0 V26" fill="none" stroke="${C.brownDeep}" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M17.5 26.5 h29 l3 22.5 q0.6 5.5 -5 5.5 h-25 q-5.6 0 -5 -5.5 z" fill="${C.brownDeep}"/>
  <text x="32" y="44.5" font-family="Arial, sans-serif" font-weight="900" font-size="17" text-anchor="middle" fill="url(#${gid})">S</text>`;

const markScaled = (gid, x, y, px) =>
  `<g transform="translate(${x} ${y}) scale(${px / 64})">${mark(gid)}</g>`;

// ── 1. favicon ────────────────────────────────────────────────────────────
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark("fav")}</svg>`;

// ── 2. apple icon 180x180 ────────────────────────────────────────────────
const appleIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">${mark("apple")}</svg>`;

// ── 3. Open Graph / Twitter card 1200x630 ─────────────────────────────────
const cardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    ${goldGradient("cardGold")}
    ${goldFlat("cardFlat")}
    ${glow("cardGlow")}
    <linearGradient id="cardShine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="cardClip"><rect width="1200" height="630"/></clipPath>
  </defs>

  <rect width="1200" height="630" fill="${C.brownDeep}"/>

  <g clip-path="url(#cardClip)">
    <ellipse cx="940" cy="290" rx="540" ry="440" fill="url(#cardGlow)"/>
    <g stroke="url(#cardFlat)" stroke-opacity="0.14" stroke-width="2">
      <path d="M-60 640 L540 -60"/>
      <path d="M120 700 L760 -40"/>
      <path d="M300 720 L1000 -20"/>
    </g>
    <rect x="0" y="0" width="1200" height="630" fill="url(#cardShine)"/>
    <g fill="url(#cardGold)">
      <path d="M1058 96 l7 14 14 7 -14 7 -7 14 -7 -14 -14 -7 14 -7 z" opacity="0.85"/>
      <path d="M1104 168 l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4 z" opacity="0.6"/>
      <path d="M78 528 l4 8 8 4 -8 4 -4 8 -4 -8 -8 -4 8 -4 z" opacity="0.55"/>
    </g>
  </g>

  <rect x="30" y="30" width="1140" height="570" rx="26" fill="none" stroke="url(#cardFlat)" stroke-width="2" stroke-opacity="0.7"/>

  ${markScaled("m1", 100, 122, 158)}

  <text x="290" y="206" font-family="Arial, sans-serif" font-weight="900" font-size="74" letter-spacing="-1.5" fill="${C.cream}">SwagOn<tspan fill="url(#cardGold)">Campus</tspan></text>
  <text x="292" y="258" font-family="Arial, sans-serif" font-size="29" fill="${C.tan}">Campus Fashion for FUNAAB Students</text>

  <path d="M100 320 H1100" stroke="url(#cardFlat)" stroke-width="1.5" stroke-opacity="0.55"/>

  <rect x="100" y="362" width="338" height="60" rx="30" fill="${C.whatsapp}"/>
  <text x="269" y="400" font-family="Arial, sans-serif" font-weight="700" font-size="24" text-anchor="middle" fill="#ffffff">Order via WhatsApp</text>
  <text x="472" y="400" font-family="Arial, sans-serif" font-size="26" fill="${C.tan}">swagoncampus.vercel.app</text>

  <text x="100" y="548" font-family="Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="6" fill="${C.muted}">PREMIUM STREETWEAR • CAMPUS DELIVERY</text>

  <text x="1100" y="548" font-family="Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="6" text-anchor="end" fill="${C.muted}">FUNAAB • ABEOKUTA</text>
</svg>`;

// ── 4. WhatsApp status / story 1080x1920 ─────────────────────────────────
const statusSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    ${goldGradient("stGold")}
    ${goldFlat("stFlat")}
    ${glow("stGlow")}
    <linearGradient id="stShine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="stClip"><rect width="1080" height="1920"/></clipPath>
  </defs>

  <rect width="1080" height="1920" fill="${C.brownDeep}"/>

  <g clip-path="url(#stClip)">
    <ellipse cx="540" cy="620" rx="700" ry="620" fill="url(#stGlow)"/>
    <ellipse cx="520" cy="1560" rx="620" ry="520" fill="url(#stGlow)" opacity="0.5"/>
    <g stroke="url(#stFlat)" stroke-opacity="0.13" stroke-width="2">
      <path d="M-100 1180 L1180 -100"/>
      <path d="M-100 1360 L1180 80"/>
      <path d="M-100 1540 L1180 260"/>
      <path d="M-100 -100 L1180 1280"/>
    </g>
    <rect x="0" y="0" width="1080" height="1920" fill="url(#stShine)"/>
    <g fill="url(#stGold)">
      <path d="M920 180 l9 18 18 9 -18 9 -9 18 -9 -18 -18 -9 18 -9 z" opacity="0.8"/>
      <path d="M150 320 l5 10 10 5 -10 5 -5 10 -5 -10 -10 -5 10 -5 z" opacity="0.55"/>
      <path d="M880 1700 l7 14 14 7 -14 7 -7 14 -7 -14 -14 -7 14 -7 z" opacity="0.6"/>
    </g>
  </g>

  <rect x="36" y="36" width="1008" height="1848" rx="34" fill="none" stroke="url(#stFlat)" stroke-width="2.5" stroke-opacity="0.7"/>

  ${markScaled("sm1", 420, 430, 240)}

  <text x="540" y="820" font-family="Arial, sans-serif" font-weight="900" font-size="88" text-anchor="middle" fill="${C.cream}">SwagOn<tspan fill="url(#stGold)">Campus</tspan></text>

  <path d="M320 878 H760" stroke="url(#stFlat)" stroke-width="2" stroke-opacity="0.6"/>

  <text x="540" y="964" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="${C.tan}">Campus Fashion for FUNAAB Students</text>

  <text x="540" y="1130" font-family="Arial, sans-serif" font-weight="900" font-size="92" letter-spacing="-1.5" text-anchor="middle" fill="url(#stGold)">Dress Like You</text>
  <text x="540" y="1248" font-family="Arial, sans-serif" font-weight="900" font-size="92" letter-spacing="-1.5" text-anchor="middle" fill="${C.cream}">Own the Campus.</text>

  <rect x="300" y="1356" width="480" height="86" rx="43" fill="${C.whatsapp}"/>
  <text x="540" y="1411" font-family="Arial, sans-serif" font-weight="700" font-size="33" text-anchor="middle" fill="#ffffff">Order on WhatsApp</text>

  <text x="540" y="1562" font-family="Arial, sans-serif" font-size="32" text-anchor="middle" fill="${C.tan}">swagoncampus.vercel.app</text>

  <text x="540" y="1756" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="7" text-anchor="middle" fill="${C.muted}">FUNAAB • ABEOKUTA</text>
</svg>`;

// ── Write everything ──────────────────────────────────────────────────────
async function render(svg, relPath, { density } = {}) {
  const out = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const pipeline = density
    ? sharp(Buffer.from(svg), { density }).png()
    : sharp(Buffer.from(svg)).png();
  const info = await pipeline.toFile(out);
  console.log(
    `  ${relPath}  ${info.width}x${info.height}  ${Math.round(fs.statSync(out).size / 1024)}KB`
  );
}

(async () => {
  try {
    fs.mkdirSync(path.join(ROOT, "app"), { recursive: true });
    fs.writeFileSync(path.join(ROOT, "app", "icon.svg"), iconSvg);
    console.log("  app/icon.svg  64x64  (svg)");

    await Promise.all([
      render(appleIconSvg, "app/apple-icon.png"),
      render(cardSvg, "app/opengraph-image.png"),
      render(cardSvg, "app/twitter-image.png"),
      render(statusSvg, "public/social/whatsapp-status.png"),
    ]);

    console.log("\nBrand assets ready.");
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
})();
