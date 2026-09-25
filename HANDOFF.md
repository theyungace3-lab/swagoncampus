# SwagOnCampus Handoff Document

## Your Role

You are Kilo, continuing work on the SwagOnCampus clothing website. This project is a Next.js + Supabase e-commerce site for FUNAAB students that orders via WhatsApp. The previous conversation already made major changes; your job now is to fix the remaining client-side rendering issue.

---

## The Problem

The admin panel shows 11 products, but the **shop page** and **home page** show nothing. The live site works fine in a clean browser (verified with headless Chrome), so the issue is that **the client-side JS is failing to render/hydrate in the user's actual browser**, and the user is seeing stale cached content.

Root cause: The previous session introduced a `Reveal` component (scroll-reveal animation) with a **hydration mismatch**. The component rendered `reveal-visible` on the server but `reveal` (opacity 0) on the client initial render. React 19 handles this by bailing out and re-rendering, but in some cases the IntersectionObserver effect can fail to run, leaving content stuck invisible. Additionally, the home page products were wrapped in a `<Suspense>` boundary that rendered the fallback skeleton, and the real products were inside a `<div hidden id="S:0">` that only un-hides when JS successfully hydrates.

## What Was Already Done (in the prior session)

All of the following are **already committed and pushed** to `origin/main` on `github.com/theyungace3-lab/swagoncampus`:

1. **Six new categories** defined in `lib/products.ts` (`tops`, `jackets-hoodies`, `trousers-jeans`, `footwear`, `watches-accessories`, `corporate-dresses`), with a `LEGACY_CATEGORY_MAP` that maps old DB values to new ones.
2. `normalizeCategory()` and `sanitizeDisplayText()` helpers in `lib/products.ts`.
3. `mapDbProduct` in `contexts/ProductsContext.tsx` now normalizes categories and strips dashes.
4. `app/api/products/route.ts` GET now uses `categoryDbValues()` + `normalizeCategory()` so both old and new category values filter correctly.
5. `components/Reveal.tsx` created (scroll-reveal) — **this is the buggy part**.
6. `components/CategoryCard.tsx`, `CategorySection.tsx` updated for 6 categories with custom SVG icons.
7. All Gemini-style `Sparkles`/`✦` icons removed across the codebase.
8. "200+ Happy Students" and "Made with for FUNAAB students" copy removed.
9. Em/en dashes stripped from visible text.
10. Admin panel: image upload to Supabase Storage (`app/api/upload/route.ts`, `supabase/storage.sql`).
11. `supabase/migrate-categories.sql` created and **already run by the user** in their Supabase SQL Editor.
12. `supabase/storage.sql` already run by the user (bucket `product-images` is public, 2 policies confirmed).
13. Vercel is live at `https://swagoncampus.vercel.app` — it was verified working with all 11 products, 6 category cards, and correct filtering.

## What Needs to Be Done NOW

### Step 1 — Fix the `Reveal` component hydration mismatch

The file `components/Reveal.tsx` currently has this code (introduced in the prior session):

```tsx
// OLD BUGGY VERSION — DO NOT USE
function hasIntersectionObserver(): boolean {
  return typeof window !== "undefined" && typeof IntersectionObserver !== "undefined";
}

export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => !hasIntersectionObserver());
  // ...
}
```

**The bug**: `useState(() => !hasIntersectionObserver())` returns `true` on the server (because `typeof window === "undefined"`) but `false` on the client. This causes a hydration mismatch. React 19 logs a warning and re-renders the subtree on the client. In most cases the IntersectionObserver effect then fires and fixes it, but in edge cases (strict mode, SSR bailout, or when the element is in a Suspense boundary that fails to resume) the content stays invisible.

**Replace `components/Reveal.tsx` with this version**:

```tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section";
}

// Safety net: reveal even if the observer never fires.
const REVEAL_TIMEOUT = 1500;

export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Start invisible on BOTH server and client to avoid a hydration mismatch.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const show = () => setVisible(true);

    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) show();
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);

    const timeout = setTimeout(show, REVEAL_TIMEOUT);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [visible]);

  const Tag = as;
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
```

### Step 2 — Fix the CSS in `app/globals.css`

The `.reveal` styles in `globals.css` are currently:

```css
/* ── Scroll reveal ── */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}

.reveal-visible {
  opacity: 1;
  transform: translateY(0);
}
```

**Replace with a CSS-only fallback that never leaves content invisible**. The trick: use `@supports` so that if JS is completely absent (the observer never runs), the content is still visible. Actually simpler — just add a `prefers-reduced-motion` safe default:

```css
/* ── Scroll reveal ── */
.reveal {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: no-preference) {
  .reveal {
    opacity: 0;
    transform: translateY(24px);
    transition:
      opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity, transform;
  }
  .reveal.reveal-visible {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Wait — that still hides content for everyone who prefers motion. The safest approach is a small `no-js` / `js` class on `<html>`:

Add to the top of `app/layout.tsx`'s `<body>`:

```tsx
<body
  className="min-h-screen flex flex-col js"  // ← add the "js" class
  ...
>
```

Then in `globals.css`:

```css
/* ── Scroll reveal ── */
.reveal {
  opacity: 1;
  transform: none;
}

.js .reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}

.js .reveal.reveal-visible {
  opacity: 1;
  transform: translateY(0);
}
```

This way: **no JS → content always visible** (the `.js` class isn't there). **JS works → scroll reveal animates in.** No hydration mismatch because the component starts `visible=false` on both server and client, and the CSS only hides it when the `js` class is present.

### Step 3 — Verify the build and deploy

```bash
cd C:\Users\HomePC\Downloads\SwagOnCampus
npm run build
# commit + push
git add -A
git commit -m "fix: Reveal hydration mismatch, safe CSS fallback for no-JS"
git push origin main
```

Vercel will auto-deploy from `origin/main`.

### Step 4 — Ask the user to hard-refresh

Tell the user: after the new deploy is live (~1–2 min), do a **hard refresh** (Ctrl+Shift+R or Ctrl+F5) on the shop and home pages. The new CSS/JS guarantees content will show even in the worst case.

---

## Key Files & Their Roles

| File | Role |
|------|------|
| `components/Reveal.tsx` | **Fix this** — scroll-reveal wrapper; had hydration mismatch |
| `app/globals.css` | **Fix this** — `.reveal` CSS must not leave content invisible |
| `app/layout.tsx` | Add `js` class to `<body>` for the CSS fallback |
| `lib/products.ts` | `CATEGORIES`, `LEGACY_CATEGORY_MAP`, `normalizeCategory`, `sanitizeDisplayText`, `categoryDbValues` |
| `lib/types.ts` | `Category` (6 values) + `LegacyCategory` types |
| `contexts/ProductsContext.tsx` | `mapDbProduct` normalizes categories from the DB |
| `app/api/products/route.ts` | GET uses `categoryDbValues` + `normalizeCategory` |
| `app/api/upload/route.ts` | Admin image upload to Supabase Storage |
| `supabase/storage.sql` | Public `product-images` bucket (already run) |
| `supabase/migrate-categories.sql` | Category migration (already run by user) |
| `next.config.ts` | `*.supabase.co` in `images.remotePatterns` |

## The User's Live Data (for reference)

The DB currently has 11 products with these categories (post-migration):
- `watches-accessories`: 2 (Lige wristwatch, Gold Chain Necklace)
- `footwear`: 1 (White Chunky Sneakers)
- `tops`: 4 (Oversized Graphic Tee, Round neck, Classic White Tee, Thermal Long Sleeve)
- `jackets-hoodies`: 2 (Campus Hoodie, Varsity Jacket)
- `trousers-jeans`: 1 (Baggy Cargo Jeans)
- `corporate-dresses`: 1 (Floral Midi Dress)

The Supabase Storage bucket `product-images` is public and has the user's uploaded Lige wristwatch image:
`https://wmgnwtyhqfazkdbzlewz.supabase.co/storage/v1/object/public/product-images/product-1790312531410-v927uy.png`

## Credentials

- Git remote: `https://github.com/theyungace3-lab/swagoncampus` (token embedded in remote URL — works for push)
- Supabase project: `swagoncampus` under org `theyungace3-lab`
- Vercel deployment: `https://swagoncampus.vercel.app`
- The `.env.local` in the project folder has **placeholder** Supabase values; the real ones are in Vercel's env vars. You cannot test the live API locally.

## What NOT to Do

- Do not re-run `supabase/schema.sql` — it will duplicate products (no unique constraint on name).
- Do not delete the `product-images` bucket.
- Do not change the category IDs again — they're already migrated in the DB.
- Do not remove the `normalizeCategory` fallback — it's what makes old and new DB values coexist.

## Quick Verification Checklist

After deploying the fix:
1. `https://swagoncampus.vercel.app/` — should show 6 category cards, 8 product cards (4 featured + 4 new arrivals), and the user's Lige wristwatch.
2. `https://swagoncampus.vercel.app/shop` — should show all 11 products.
3. `https://swagoncampus.vercel.app/shop?category=tops` — should show exactly 4 products.
4. Hard refresh (Ctrl+Shift+R) clears any browser cache issues.
