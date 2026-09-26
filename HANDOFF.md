# SwagOnCampus Handoff Document

You are continuing work on the **SwagOnCampus** clothing site at `C:\Users\HomePC\Downloads\SwagOnCampus`.
It is a Next.js (App Router) + Supabase e-commerce store for FUNAAB students. Orders happen via WhatsApp (number `2348185319037`, hardcoded in several components). Live at `https://swagoncampus.vercel.app`. The git remote embeds a working token, so `git push origin main` needs no sign-in.

Read this file first, then resume where the prior session stopped.

---

## Where things stand

The repo has moved well past the old hydration-bug era. These are **all committed and pushed to `origin/main`**:

| Commit | What it did |
|--------|-------------|
| `5fda782` | module-level Supabase singleton; ignore `INITIAL_SESSION` in auth callback |
| `da06e1e` | 6 categories, removed sparkles/dashes/copy, animations, admin image upload |
| `dfa32df` | **fixed the `Reveal` hydration mismatch** + safe no-JS CSS fallback in `globals.css` + `js` class on `<body>` |
| `e552577` | hid the site navbar/footer/cart drawer on the `/admin` panel (new `components/SiteChrome.tsx`) |
| `db13940` | Temu-style silent add-to-cart + floating cart button (`components/FloatingCartButton.tsx`) |
| `659a427` | replaced category icons with monochrome gold line icons |
| `678cdd5` | category cards now use **real photos** in `public/categories/*.jpg` |
| `79f736a` | **brand identity**: `components/BrandMark.tsx`, `app/icon.svg`, `app/apple-icon.png`, `app/opengraph-image.png`, `app/twitter-image.png`, `public/social/whatsapp-status.png`, generator script `scripts/brand-assets.cjs`, metadata in `app/layout.tsx` |

`HEAD` is `79f736a` and matches `origin/main` (0 commits ahead).

---

## The UNCOMMITTED work sitting in the working tree

The last user request had four parts. The **code is already written** (build passes, `npx eslint` clean on the touched files — the one remaining error is a pre-existing `react-hooks/set-state-in-effect` warning at `components/Navbar.tsx` around the `setMounted` effect, not introduced here). What's left is to **verify, commit, and push**.

### 1. Header now exposes all 6 categories
`components/Navbar.tsx`:
- `navLinks` was trimmed to just Home + Shop.
- A **Categories dropdown** (desktop) and a **categories section** (mobile menu) now list all six categories, built from `CATEGORIES` in `lib/products.ts` so it stays in sync.
- `ChevronDown` toggles the dropdown; click-outside closes it.

### 2. "Add to Cart" no longer overlaps on narrow cards
`components/ProductCard.tsx` — the actions row was rebuilt:
- The add-to-cart button is now a fixed `h-10` with `whitespace-nowrap`, `min-w-0`, `overflow-hidden` and a `truncate` label.
- Label is responsive: shows **"Add"** below `sm`, **"Add to Cart"** at `sm` and up.
- The WhatsApp circle button stays `w-10 h-10` with `flex-shrink-0`.

### 3. Footer / category links actually change the shop filter
`app/shop/ShopClient.tsx` — the active category is now **derived from the URL** instead of captured into `useState` once:
- `activeCategory` is read straight from `useSearchParams()`.
- A new `selectCategory(next)` helper does `router.replace('/shop?category=…' or '/shop')` with `{ scroll: false }`, so clicking footer/navbar/homepage category links updates the filter even when already mounted on `/shop`.
- `normalizeCategory()` still handles legacy values.

### 4. Real WhatsApp logo everywhere
New `components/WhatsAppIcon.tsx` — the official WhatsApp glyph (standard path data, `fill="currentColor"`). It replaced the generic lucide `MessageCircle` in **six** places:
- `components/ProductCard.tsx`
- `components/CartDrawer.tsx`
- `components/Footer.tsx`
- `components/HeroSection.tsx`
- `app/cart/page.tsx`
- `app/product/[id]/ProductDetailClient.tsx`

---

## Do this next (the actual task)

1. **Verify the uncommitted changes render.** Quick check: run `npm run build` (should pass), optionally `npm run start` and open `/`, `/shop`, `/shop?category=tops`, `/cart` to confirm the navbar dropdown, the category-filter-from-URL behavior, the fixed add-to-cart button, and the WhatsApp logo all look right. Hard-refresh to bust cache.
2. **Commit and push** (this was the last explicit intent, but confirm with the user if unsure):
   ```
   git add -A
   git commit -m "fix: all categories in header, URL-synced shop filter, WhatsApp logo, no add-to-cart overlap"
   git push origin main
   ```
3. **Watch the Vercel auto-deploy**, then hard-refresh the live site.

---

## Gotchas / notes

- **`npx eslint` will always show 1 pre-existing error**: `react-hooks/set-state-in-effect` for `useEffect(() => { setMounted(true) }, [])` in `components/Navbar.tsx`. Not caused by this work. Leave it or fix separately (the mounted-gated rendering is intentional for the `next-themes` toggle).
- **`Reveal` + `.reveal` CSS + `js` body class** are already fixed and committed (`dfa32df`). Don't regress them. `app/globals.css` only hides `.reveal` when the `js` class is present, so no-JS visitors always see content.
- The `lucide-react` version in `package.json` is `^1.32.0` (unusual for lucide). Don't "fix" it — it's pinned by the project.
- The WhatsApp phone number `2348185319037` is hardcoded in `ProductCard`, `CartDrawer`, `Footer`, `HeroSection`, `ProductDetailClient`, and `cart/page.tsx`. If it changes, update all of them.
- `public/categories/*.jpg` are the real category photos. They are **low-res** (roughly 200–550 px). They're fine for the small category tiles but will look soft on high-DPI phones. If the user supplies crisper images, drop them into `public/categories/` with the same filenames and push.
- **`scripts/brand-assets.cjs`** regenerates the brand PNGs (og image, apple icon, WhatsApp status). It needs `sharp` (present in `node_modules` via Next). Re-run it if you change the mark, then commit the regenerated PNGs. The `BrandMark.tsx` inline SVG is the source of truth for the in-UI logo.
- The `.kilo/worktrees/quilt-darkness/` directory is a stale Agent-Manager worktree that is **git-ignored** (it can't be pushed). It gets linted as if it were the repo, which is just noise — ignore it or clean it up separately.
- `app/ShopClient.tsx` uses `useSearchParams`, which is why `app/shop/page.tsx` wraps it in `<Suspense>`. That pattern is required or the build fails.

## Quick orientation

- Categories live in `lib/products.ts` (`CATEGORIES`, `LEGACY_CATEGORY_MAP`, `normalizeCategory`).
- Product data comes from Supabase via `contexts/ProductsContext.tsx` and `app/api/products/route.ts`.
- The admin panel is at `/admin`, guarded in `app/admin/AdminClient.tsx`; the site chrome is hidden there via `components/SiteChrome.tsx`.
- Theme tokens (gold/brown, light/dark) are in `app/globals.css` (`:root` and `.dark`).
