#!/usr/bin/env node
/**
 * Backfill long-lived Cache-Control on existing product images.
 *
 * Supabase only honours cache headers when the value is a valid directive list,
 * so "31536000" becomes the invalid `public, 31536000`. This re-uploads every
 * product image (same path, same bytes) with
 *   Cache-Control: public, max-age=31536000, immutable
 * which lets Netlify/Vercel image CDNs cache transformed variants instead of
 * re-fetching and re-encoding the original on every request.
 *
 * Usage:  node scripts/backfill-image-cache.mjs
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from "node:fs";

const BUCKET = "product-images";
const MARKER = `/storage/v1/object/public/${BUCKET}/`;
const CACHE_CONTROL = "max-age=31536000, immutable";
const CONCURRENCY = 3;

async function withRetry(fn, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError;
}

function loadEnv() {
  const env = {};
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env vars in .env.local");

const auth = { apikey: key, Authorization: `Bearer ${key}` };

function contentTypeFor(path, fallback) {
  if (fallback && fallback.startsWith("image/")) return fallback;
  const ext = path.split(".").pop()?.toLowerCase();
  return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" }[ext] ?? "application/octet-stream";
}

const res = await fetch(`${url}/rest/v1/products?select=image`, { headers: auth });
if (!res.ok) throw new Error(`products query failed: ${res.status} ${await res.text()}`);

const paths = new Set();
for (const row of await res.json()) {
  const image = String(row.image ?? "");
  const i = image.indexOf(MARKER);
  if (i === -1) continue;
  const path = decodeURIComponent(image.slice(i + MARKER.length).split("?")[0]);
  if (path) paths.add(path);
}

console.log(`Found ${paths.size} product images to update`);
let done = 0;
let failed = 0;

async function update(path) {
  try {
    await withRetry(async () => {
      const src = `${url}/storage/v1/object/public/${BUCKET}/${path}`;
      const download = await fetch(src, { headers: auth });
      if (!download.ok) throw new Error(`download ${download.status}`);
      const bytes = Buffer.from(await download.arrayBuffer());
      const type = contentTypeFor(path, download.headers.get("content-type"));

      const upload = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
        method: "POST",
        headers: { ...auth, "x-upsert": "true", "cache-control": CACHE_CONTROL, "Content-Type": type },
        body: bytes,
      });
      if (!upload.ok) throw new Error(`upload ${upload.status} ${await upload.text()}`);
    });
    done += 1;
    if (done % 10 === 0) console.log(`  ${done}/${paths.size} updated`);
  } catch (err) {
    failed += 1;
    console.error(`  FAILED ${path}: ${err.message}`);
  }
}

const queue = [...paths];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) await update(next);
  })
);

console.log(`Done: ${done} updated, ${failed} failed`);

const check = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${[...paths][0]}`, { headers: auth, method: "GET" });
console.log(`Sample header: ${check.headers.get("cache-control")}`);
