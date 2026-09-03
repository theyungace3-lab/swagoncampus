# SwagOnCampus — Deployment Guide

## Step 1 — Run the Supabase schema

1. Go to **supabase.com** → your project → **SQL Editor**
2. Click **New query**
3. Paste the entire contents of `supabase/schema.sql`
4. Click **Run**

This creates: `products`, `discounts`, `profiles`, `orders` tables + seeds sample products.

---

## Step 2 — Configure environment variables

Open `.env.local` and fill in your real values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_ADMIN_EMAIL=theyungace3@gmail.com
```

Get these from: **Supabase → Settings → API**

---

## Step 3 — Set your WhatsApp number

Search for `2348000000000` in the codebase and replace with your real number:

```bash
# In VS Code: Ctrl+Shift+H → find 2348000000000 → replace with your number
```

---

## Step 4 — Add auth background images

Save your two attached images as:
- `public/auth-signin-bg.jpg`  (wooden hangers photo)
- `public/auth-signup-bg.jpg`  (colorful clothing rack photo)

---

## Step 5 — Deploy to Vercel

### Push to GitHub first:
```bash
git add .
git commit -m "feat: add Supabase backend + auth + admin panel"
git push origin main
```

### Deploy on Vercel:
1. Go to **vercel.com** → **Add New Project**
2. Import your `swagoncampus` GitHub repo
3. In **Environment Variables**, add all 4 vars from `.env.local`
4. Click **Deploy**

Your live URL will be: `https://swagoncampus.vercel.app`

---

## Step 6 — Configure Supabase Auth

In **Supabase → Authentication → URL Configuration**:
- Site URL: `https://swagoncampus.vercel.app`
- Redirect URLs: `https://swagoncampus.vercel.app/auth/callback`

---

## Step 7 — Make yourself admin

After you sign up on the live site with your admin email, you're automatically
protected by the `NEXT_PUBLIC_ADMIN_EMAIL` env var — only that email can access
`/admin`. No extra setup needed.

---

## How to update products / prices / discounts

Visit `https://swagoncampus.vercel.app/admin` → sign in with your admin email.

- **Products tab** — add, edit, delete, toggle stock/featured
- **Sales & Discounts tab** — create percentage or fixed discounts per product or site-wide
