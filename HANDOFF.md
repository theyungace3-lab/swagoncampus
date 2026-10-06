# HANDOFF — Real-Time Analytics for the Admin Panel

Last updated: 2026-10-06.

## Current Status

The analytics implementation is complete, deployed to Vercel production, and
active against the live Supabase project `wmgnwtyhqfazkdbzlewz`. The old plan
below is archived and must not be followed as an outstanding implementation checklist.

## Email OTP Auth (added 2026-10-06)

Sign-in and password reset both support a free 6-digit email code. No SMS or
WhatsApp OTP — those cost money per message.

- **Sign in** (`/auth/signin`): a Password / Email code toggle. Email code uses
  `signInWithOtp({ shouldCreateUser: false })` then `verifyOtp({ type: 'email' })`,
  so it can never create an account as a side effect.
- **Forgot password** (`/auth/forgot-password`): email → 6-digit code →
  new password. Uses `resetPasswordForEmail` → `verifyOtp({ type: 'recovery' })`
  → `updateUser({ password })`, then `signOut({ scope: 'global' })` so any other
  signed-in device with the old password is invalidated. The emailed link also
  works: it returns via `/auth/callback` to the same page. An expired or reused
  link falls back to the request step with a clear message.
- Shared `components/OtpInput.tsx` (6 boxes, paste, arrows, auto-submit on the
  sixth digit) and a 60-second resend cooldown matching Supabase's per-user window.

### REQUIRED Supabase dashboard config for OTP

The code is not in the email template by default — only a link. **Add the token
or the OTP screens will have nothing to verify.**

1. **Authentication → Emails → Magic Link**: include `{{ .Token }}`
   (keep `{{ .ConfirmationURL }}` too if you want both).
2. **Authentication → Emails → Reset Password**: include `{{ .Token }}`.
3. **Authentication → Providers → Email**: confirm the OTP length is 6 (default).
4. **Authentication → URL Configuration**: Site URL `https://swagoncampus.vercel.app`
   and Redirect URLs `https://swagoncampus.vercel.app/**`, `http://localhost:3000/**`.
5. **Email volume**: the built-in sender allows only **2 emails per hour per
   project** (~48/day) — that is the real limit, not money. Set up free custom
   SMTP (e.g. Gmail app password ~500/day, or Resend/Brevo free tiers) under
   Authentication → Emails → SMTP Settings to lift it. Supabase's free plan
   itself allows 50,000 monthly active users.

## Multi-Vendor (added 2026-10-06)

The store owner keeps a supreme panel; other sellers get a scoped vendor panel.

- **Owner** (`NEXT_PUBLIC_ADMIN_EMAIL`): full admin panel at `/admin` — Analytics,
  Products (all uploads, with an "Uploaded by" column and filter), Vendors, and
  Sales & Discounts. Only the owner ever sees analytics.
- **Vendor**: `profiles.role = 'vendor'`. Panel at `/vendor` shows only their own
  products (add / edit / delete / stock). No analytics, no discounts, no featured.
- **Promotion**: the owner promotes an account to vendor from the new **Vendors**
  tab (`PATCH /api/admin/vendors`). The owner's own role can never be changed there.
- **Pricing**: a vendor sets their own price; the customer-facing price is
  `vendor_price + OWNER_MARKUP` (₦500). The server computes it (`lib/vendorProduct.ts`)
  so a vendor cannot tamper with `price`, `markup`, `vendor_id`, or `featured`.
  Store-owned products have `vendor_id = null` and are never visible to vendors.
- **Defence in depth**: authorization is enforced in the API routes (`lib/authz.ts`)
  and again in Postgres RLS (`supabase/vendors.sql`, helpers `is_owner()` /
  `is_vendor()`). Uploads are namespaced per user (`<uid>/file`) and folder-isolated.
- Public storefront still lists every product (owner + vendors).

**Action required:** run `supabase/vendors.sql` once in the Supabase SQL Editor
(Role `postgres`). It is idempotent and safe to re-run. Until it runs, the owner
panel and storefront still work (owner product writes omit the new columns), but
the Vendors tab and `/vendor` do nothing useful.

### Verification

- `npm test` (22 tests): analytics + vendor scoping. Covers owner/vendor/customer
  writes, cross-vendor edit/delete denial, server-computed markup, tamper resistance,
  `/api/vendor/products` scoping, and owner-only vendor promotion.
- `npx tsc --noEmit` and `npm run build` pass (routes `/vendor`,
  `/api/vendor/products`, `/api/admin/vendors` present).
- Isolated PGlite run of `supabase/vendors.sql`: `is_owner`/`is_vendor`, RLS write
  rules, cross-vendor denial, owner override, storage folder isolation, idempotent re-run.
- Browser render of the real vendor panel (mocked auth/data): own-products list, no
  analytics, vendor vs customer pricing, fee hint, POST on add, non-vendor redirect.

### Completed

- Analytics is the default admin tab; Products and Sales & Discounts remain intact.
- The local admin email is now `theyungace3@gmail.com`.
- Dashboard metrics include active visitors, today's and total visitors, registered
  accounts, unique checkout visitors, checkout clicks, WhatsApp clicks, pageviews,
  add-to-cart actions, and recorded database orders.
- Accounts come from `auth.users`, not client-reported signup events or profile dates.
- Route tracking is mounted globally and excludes admin/API paths. Anonymous browser
  IDs persist in localStorage, with an in-memory fallback when storage is blocked.
- Visible tabs send a heartbeat every minute. Active means seen within 5 minutes;
  heartbeats do not inflate pageviews or clutter the activity feed.
- Only actual product/cart order-link activations emit `checkout_start`. Opening
  a cart does NOT count as checkout, and genuine clicks/add actions are not throttled.
- Each checkout emits one event and is included in both checkout and WhatsApp totals.
  General Hero/Footer contact links emit `whatsapp_click`. These are not completed sales.
- All order-link surfaces are marked: ProductCard, ProductDetailClient,
  CartDrawer, and the cart page; Hero/Footer use the same store number through
  the shared `lib/whatsapp.ts` helper (`2348103843353`).
- Realtime notifications cover analytics events, new profiles, and orders, with
  coalesced refreshes, a 20-second polling backup, visibility handling, pause/resume,
  cleanup, and explicit stale/error/setup states.
- Charts include an accessible hourly data table, shopping-intent percentages,
  top pages, and recent actions. Day and hour boundaries use `Africa/Lagos`.
- Ingestion validates origins (including loopback/proxy hosts), streamed body size,
  event types, IDs, and paths. It strips query strings and fragments.
- Only the server may insert analytics rows. The summary RPC is service-role-only,
  the GET endpoint verifies the signed-in owner, and raw event SELECT is owner-only.
- No new project dependencies were added. `npm run test:analytics` uses the existing
  TypeScript package and Node's test runner.

### Post-Review Fixes

Addressed all findings from the `/review uncommitted` pass:

- **Owner identity is one source.** `public.analytics_admin_email()` is the single
  place the owner email lives; all three RLS policies use it. It honours
  `app.admin_email` (matching `schema.sql`) and falls back to the owner literal.
- **Summary query is indexed.** `analytics_summary()` is now a SQL function whose
  figures are individual sargable subqueries (no single full-scan aggregate), plus
  a new `(type, visitor_id)` index for the all-time distinct counts.
- **No unused aggregation.** The `byType` block and its `EventTotal` type were removed.
- **Realtime is throttled.** The dashboard ignores `heartbeat` inserts and enforces a
  10-second minimum gap between realtime-triggered refetches, so traffic bursts cannot
  turn the 20s backup poll into a ~1 Hz loop.
- **Ingest is rate-limited.** Best-effort per-visitor (60/min) and per-IP (240/min)
  fixed windows return `429` with `Retry-After`; documented as a per-instance speed bump.
- **Event types are one source.** `ANALYTICS_EVENT_TYPES` in `lib/supabase/types.ts`
  drives both the `AnalyticsEventType` union and the API whitelist.
- **WhatsApp number is one source.** `lib/whatsapp.ts` holds the number and message
  helper used by all six `wa.me` surfaces.

**Re-run `supabase/analytics.sql` in the Supabase SQL Editor** to apply the SQL-side
fixes (index, owner-email helper, policies, summary function). The app works without
it, but the query and policy improvements require it. It is idempotent.

### Deployment (Done)

- Production: `https://swagoncampus.vercel.app` (Vercel project `samad8/swagoncampus`).
- `supabase/analytics.sql` was executed in the live project's SQL Editor
  ("Success. No rows returned").
- Production env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `NEXT_PUBLIC_ADMIN_EMAIL=theyungace3@gmail.com` were already correct.
  `SUPABASE_SERVICE_ROLE_KEY` was an 11-character placeholder and was replaced with
  the real `service_role` key for this project (stored as a Sensitive variable).
- Live checks: the table and `analytics_summary` RPC respond to the service role
  (5 existing accounts counted, 0 visitors at activation time); an unauthenticated
  `GET /api/analytics` returns 401; a `heartbeat` POST returned 201 and the row was
  confirmed in Supabase and then removed, leaving no test data. `/`, `/shop`, `/cart`,
  `/auth/signin`, and `/admin` all return 200.

### Remaining

- Re-run `supabase/analytics.sql` in the Supabase SQL Editor (see Post-Review Fixes),
  then rebuild/redeploy so the live app uses the updated summary function and policies.
- Sign in as `theyungace3@gmail.com`, open `/admin`, and browse the storefront in a
  separate browser/incognito window to see live activity appear.

### Verification

- `npm run test:analytics`: 12 passing tests for API validation, authorization,
  origin handling, rate limiting, identity persistence, tracking semantics, failure
  isolation, Strict Mode deduplication, click capture, and cleanup.
- `npx tsc --noEmit --incremental false`: passes.
- `npm run build`: passes.
- New analytics code and tests pass targeted ESLint checks.
- Full-project lint still reports pre-existing errors in AdminClient, Navbar,
  ProductsContext, and `scripts/brand-assets.cjs`; it also scans `.kilo/worktrees`.
- The SQL was executed and checked in isolated PGlite: zero state, counts,
  visitor deduplication, heartbeat behavior, account source, Lagos boundaries,
  idempotent reruns, Realtime publication, RLS, and service-only RPC all pass.
- The actual React dashboard was browser-tested with mocked API/Realtime at
  desktop, 390px, and 320px widths: dark mode, reduced motion, no horizontal
  overflow, hourly table, live refresh, polling fallback, pause/resume, stale/setup
  states, authorization-loss clearing, and recovery pass.
- Temporary SQL/browser tools and screenshots are under
  `C:\Users\HomePC\AppData\Local\Temp\kilo\soc-analytics-check`, not project dependencies.

### Resume Scope

Nothing remains to implement. Keep the security model intact: do not restore public
database inserts, count cart opens as checkouts, throttle real shopping actions, or
invent live totals. The `vercel link` command appended `.vercel` and `.env*` to
`.gitignore`, which is expected and safe to keep.

## Archived Plan (Superseded)

Everything below is the previous agent's original plan, retained for history.
It is not the current implementation or a list of remaining tasks.

### Original Goal

The admin panel (signed in as the admin email, currently `theyungace3@gmail.com`
via `NEXT_PUBLIC_ADMIN_EMAIL`) needs a **real-time analytics dashboard**
showing, at minimum:

- number of visitors on the site (total / today / live now)
- number of accounts created (profiles table)
- number of people that proceeded to checkout
- number of clicks on the checkout / WhatsApp button
- plus: pageviews, add-to-cart, orders, 24h hourly chart, top pages, live event feed

## What is done (this session)

1. **`supabase/analytics.sql` (NEW, untracked — NOT yet run in Supabase)**
   - `analytics_events` table: `(id, type, visitor_id, path, user_id, created_at)`
     with `type` constrained to `pageview | whatsapp_click | checkout_start | add_to_cart`
   - indexes on `created_at`, `(type, created_at)`, `(visitor_id, created_at)`
   - RLS: public insert; admin-only select (`current_setting('app.admin_email')`)
   - `analytics_summary()` plpgsql function returning one jsonb with every metric,
     an hourly `generate_series` bucket for the last 24h, `topPages`, `byType`,
     and `recent` (last 12 events). Day boundary uses `Africa/Lagos`.
     Execute granted only to `service_role`.
   - Adds the table to the `supabase_realtime` publication (idempotent DO block).
   - **The file has NOT been run in the Supabase SQL editor yet. Until then, the
     API returns 500 and the dashboard shows an "unavailable" banner.**

   The file was scanned and is clean (all non-ASCII is intentional comment box-drawing).

## What remains (in order)

2. **`lib/analytics.ts` (NEW, client)** — tracking helper.
   - `export type AnalyticsEvent = "pageview" | "whatsapp_click" | "checkout_start" | "add_to_cart"`
   - `getVisitorId()` — stable anonymous id in `localStorage["soc_analytics_visitor"]`
     (`crypto.randomUUID` with a fallback).
   - `trackEvent(type, path?, throttled?)` — fire-and-forget `fetch("/api/analytics", {method:"POST", keepalive:true})`,
     body `{ type, visitor_id, path }`; swallows all errors.
   - `throttled` means: at most one event of that type per 30s (in-memory Map).
     Use throttle for `checkout_start` (fired from two places) and `add_to_cart`;
     no throttle for `pageview` / `whatsapp_click`.

3. **`components/AnalyticsProvider.tsx` (NEW, client)** — mounted in `app/layout.tsx`
   (inside `AuthProvider`). Two effects, no setState, so it avoids the
   `react-hooks/set-state-in-effect` lint rule this project enforces:
   - pageview: `usePathname()`; on change, if path doesn't start with `/admin`,
     `trackEvent("pageview", pathname)`.
   - WhatsApp clicks: a document-level `click` listener in **capture** phase that finds
     the closest `<a>` and, if its `href` starts with `https://wa.me/`, calls
     `trackEvent("whatsapp_click")`. One listener covers all six WhatsApp anchors
     (ProductCard, ProductDetailClient, CartDrawer, cart/page, HeroSection, Footer) —
     no per-site edits needed, and it works because some of those components are
     server components where you cannot attach onClick.

4. **`app/api/analytics/route.ts` (NEW)** — model on `app/api/orders/route.ts`:
   - `POST` (public ingest): validate `type` against the 4-value whitelist,
     `visitor_id` 8–64 chars, `path` starts with `/` and ≤200 chars (else `/`).
     Insert via `getAdminDb().from("analytics_events")`. Return 400/201/500.
   - `GET` (admin only): `await createClient()` (server, cookies) →
     `supabase.auth.getUser()`; require `user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL`
     else 401. Then `getAdminDb().rpc("analytics_summary")` and return the jsonb
     with `Cache-Control: no-store`. If the RPC is missing (migration not run),
     the Supabase error message surfaces — the client turns that into a friendly banner.
   - Add `export const dynamic = "force-dynamic";`.

5. **`lib/supabase/types.ts`** — add the `analytics_events` table shape
   (`Row` / `Insert` / `Update`) to `Database["public"]["Tables"]` and a
   `DbAnalyticsEvent` alias, matching `supabase/analytics.sql` exactly.
   Also add a `AnalyticsSummary` interface (numbers as `number`, `hourly`/`topPages`/
   `byType`/`recent` as arrays of small object shapes) so the dashboard component is typed.

6. **`components/AdminAnalytics.tsx` (NEW, client)** — the dashboard itself.
   - Fetch `GET /api/analytics` on mount and poll every 20s (`setInterval`, clear on unmount).
   - **Real-time**: `createClient().channel("analytics-live")` with a
     `postgres_changes` subscription for `INSERT` on `public.analytics_events` →
     debounce ~2s then refetch. Unsubscribe + `removeChannel` on unmount.
     Handle subscription errors gracefully (fall back to polling).
   - Show a **LIVE** badge (the `badge-pulse` class already exists in globals.css),
     "updated Xs ago", and an error banner if the API returns 500 (tell the admin
     to run `supabase/analytics.sql` in Supabase).
   - KPI cards (reuse `.luxury-card`, `.gold-text`, icons from lucide-react):
     Visitors now (live), Total visitors (today), Page views (today), Accounts created
     (7d), Checkout starts (today), WhatsApp clicks (today), Orders (7d), Add-to-cart (today).
   - Conversion funnel: pageviews → add-to-cart → checkouts → whatsapp clicks,
     with percentage bars (plain CSS widths, no chart library is installed).
   - 24h hourly bar chart from `summary.hourly` (two CSS bar columns: pageviews + whatsapp).
   - Top pages list from `summary.topPages`.
   - Live event feed from `summary.recent` (type + path + relative time).
   - `useAuth()` is available in this tree; keep the component purely presentational
     and fetch from `/api/analytics` (auth happens in the route, not the client).

7. **`app/admin/AdminClient.tsx`** — add `analytics` to `type Tab`, make it the
   default tab, add a tab button ("Analytics" / "Live Analytics"), render
   `<AdminAnalytics />` when `tab === "analytics"`. Keep the existing
   Products / Discounts tabs intact.

8. **Instrument `checkout_start` and `add_to_cart`:**
   - `components/CartDrawer.tsx` — when `isOpen && items.length > 0`, fire
     `trackEvent("checkout_start", "/cart", true)` (throttled) in a `useEffect`.
   - `app/cart/page.tsx` — on mount, if `items.length > 0`, same call (the throttle
     dedupes the double-fire).
   - `contexts/CartContext.tsx` — inside `addToCart`, fire `trackEvent("add_to_cart", undefined, true)`
     after dispatch. (Single choke point — every Add button routes through here.)
   - **Also fix a real bug found while reading `app/cart/page.tsx`:**
     `const whatsappUrl = "https://wa.me/2348000000000?..."` uses a placeholder number.
     Every other WhatsApp link in the repo uses `2348185319037`. Change the /cart page to
     the same number (flag this to the user; if 2348000000000 was intentional, say so).

## Verification

- `npx tsc --noEmit` must pass.
- `npm run build` must pass.
- `npm run lint` — must not add new errors. The repo already ships a known
  pre-existing `react-hooks/set-state-in-effect` error (in `components/Navbar.tsx`,
  ~line 31) — leave it; don't let it fail the run, just confirm you didn't add more.
- The Supabase migration cannot be verified from this machine; remind the user to
  run `supabase/analytics.sql` in the SQL editor, otherwise every KPI is 0 and the
  dashboard shows the "migration not run" banner.

## Conventions to respect

- No new npm dependencies. Styling uses CSS variables + the existing Tailwind
  utilities + the `luxury-card` / `btn-gold` / `gold-divider` / `badge-pulse` classes
  in `app/globals.css`.
- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts`
  (cookies, for API routes needing the user session), `lib/supabase/admin.ts`
  (service-role, for admin-only reads/writes). The API route should use the
  server client for auth + the admin client for the RPC/insert, mirroring `app/api/orders/route.ts`.
- This is Next 16 — `cookies()` and route `params` are async/Promise-based
  (see existing `app/api/**/route.ts` for the pattern to copy).
- `crypto.randomUUID()` is available in all target browsers; keep the `Math.random`
  fallback for safety.

## File map

```
supabase/analytics.sql            NEW  (written, needs to run in Supabase)
lib/analytics.ts                  NEW
components/AnalyticsProvider.tsx  NEW
components/AdminAnalytics.tsx     NEW
app/api/analytics/route.ts        NEW
lib/supabase/types.ts             EDIT
app/admin/AdminClient.tsx         EDIT
components/CartDrawer.tsx         EDIT
app/cart/page.tsx                EDIT (+ placeholder-number fix)
contexts/CartContext.tsx          EDIT
app/layout.tsx                   EDIT (mount AnalyticsProvider)
```

## Archived Resume Prompt (Do Not Execute)

```
Resume the analytics-dashboard work in this Next.js 16 + Supabase repo
(C:\Users\HomePC\Desktop\SwagOnCampus). Read HANDOFF.md first — it has the full
plan, what's already done, and exactly what's left, in order:

1. lib/analytics.ts        — client tracker (visitor id in localStorage + fire-and-forget POST /api/analytics, 30s throttle for checkout_start/add_to_cart)
2. components/AnalyticsProvider.tsx — in app/layout.tsx: pageview on route change (skip /admin) + a capture-phase document click listener that records whatsapp_click for any <a href^="https://wa.me">
3. app/api/analytics/route.ts — POST validates/ingests; GET is admin-only (user.email === NEXT_PUBLIC_ADMIN_EMAIL) and returns getAdminDb().rpc("analytics_summary")
4. lib/supabase/types.ts    — add analytics_events table + AnalyticsSummary types
5. components/AdminAnalytics.tsx — live dashboard (poll /api/analytics every 20s + Supabase Realtime postgres_changes on analytics_events; KPI cards, funnel, 24h CSS bar chart, top pages, live feed, "LIVE" badge via .badge-pulse, and a banner if the API 500s because the migration hasn't run)
6. app/admin/AdminClient.tsx — add the Analytics tab (default), render <AdminAnalytics />
7. Instrument: CartDrawer checkout_start (open with items), app/cart/page.tsx checkout_start (mount with items, throttled), CartContext.addToCart -> add_to_cart. ALSO fix the placeholder WhatsApp number in app/cart/page.tsx (2348000000000 -> 2348185319037).

supabase/analytics.sql is already written and clean but NOT yet applied — tell
the user to run it in Supabase > SQL Editor.

Verify: npx tsc --noEmit, npm run build, npm run lint (no NEW errors; a known
pre-existing react-hooks/set-state-in-effect in Navbar.tsx is fine to leave).
No new npm packages. Follow AGENTS.md (Next 16, async cookies/params).
```
