import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

// Load the actual TypeScript helper and its extensionless imports without
// emitting files or adding a test framework. Type checking runs separately.
const require = createRequire(import.meta.url);
const originalLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(outputText, filename);
};
const { ALL_PRODUCTS_PAGE_SIZE, createProductMix } = require("../lib/productMix.ts");
const { CATEGORIES, normalizeCategory } = require("../lib/products.ts");
if (originalLoader) require.extensions[".ts"] = originalLoader;
else delete require.extensions[".ts"];

function product(id, category = "tops", overrides = {}) {
  return {
    id,
    category,
    name: id,
    price: 5000,
    image: "/test-product.jpg",
    description: "Test fixture",
    sizes: ["M"],
    colors: ["Black"],
    inStock: true,
    createdAt: "2026-01-01T12:00:00Z",
    ...overrides,
  };
}

function catalogue(counts) {
  return Object.entries(counts).flatMap(([category, count]) =>
    Array.from({ length: count }, (_, i) =>
      product(`${category}-${String(i).padStart(2, "0")}`, category)
    )
  );
}

const ids = (products) => products.map((item) => item.id);
const opening = (products) => products.slice(0, ALL_PRODUCTS_PAGE_SIZE);
const sortedIds = (products) => ids(products).sort();

function assertBalancedPermutation(mixed, products) {
  const unique = [...new Map(products.map((item) => [item.id, item])).values()];
  assert.deepEqual(sortedIds(mixed), sortedIds(unique));
  assert.equal(new Set(ids(mixed)).size, mixed.length);

  const remaining = new Map();
  for (const item of unique) {
    const category = normalizeCategory(item.category);
    remaining.set(category, (remaining.get(category) ?? 0) + 1);
  }
  let offset = 0;
  while (remaining.size > 0) {
    const round = mixed.slice(offset, offset + remaining.size);
    assert.deepEqual(
      round.map((item) => normalizeCategory(item.category)).sort(),
      [...remaining.keys()].sort(),
      `Unbalanced round at offset ${offset}`
    );
    offset += remaining.size;
    for (const [category, count] of remaining) {
      if (count === 1) remaining.delete(category);
      else remaining.set(category, count - 1);
    }
  }
  assert.equal(offset, mixed.length);
}

function assertRecencyPreference(mixed, newArrivalIds) {
  const recent = new Set(newArrivalIds);
  const recentSeen = new Set();
  for (const item of mixed) {
    const category = normalizeCategory(item.category);
    if (recent.has(item.id)) recentSeen.add(category);
    else assert.equal(recentSeen.has(category), false, `Older ${item.id} follows a recent item`);
  }
}

test("opens with one product from every populated category, including women's categories", () => {
  const products = catalogue(Object.fromEntries(CATEGORIES.map(({ id }) => [id, 4])));
  const mixed = createProductMix(products, { seed: 2026 });
  assert.equal(ALL_PRODUCTS_PAGE_SIZE, 12);
  assert.equal(opening(mixed).length, 12);
  assert.deepEqual(
    opening(mixed).map((item) => item.category).sort(),
    CATEGORIES.map(({ id }) => id).sort()
  );
  assertBalancedPermutation(mixed, products);
});

test("handles uneven category sizes and skips exhausted categories", () => {
  const products = catalogue({ tops: 31, footwear: 1, "campus-casual": 4, athleisure: 2 });
  for (const seed of [0, 1, 42, 2026, 0xffffffff]) {
    assertBalancedPermutation(createProductMix(products, { seed }), products);
  }
});

test("includes each product ID once even when the input repeats an ID", () => {
  const products = catalogue({ tops: 6, footwear: 2 });
  products.push(products[0], { ...products[1], price: 7000 });
  assertBalancedPermutation(createProductMix(products, { seed: 123 }), products);
});

test("never mutates the input array, products, or nested product fields", () => {
  const products = Object.freeze(catalogue({ tops: 16, footwear: 3 }).map((item) =>
    Object.freeze({ ...item, sizes: Object.freeze(item.sizes), colors: Object.freeze(item.colors) })
  ));
  const before = structuredClone(products);
  const recent = Object.freeze(ids(products.slice(0, 8)));
  const previous = Object.freeze(ids(products.slice(0, 12)));
  const mixed = createProductMix(products, {
    seed: 100,
    newArrivalIds: recent,
    previousOpeningIds: previous,
  });
  assert.deepEqual(products, before);
  assert.notEqual(mixed, products);
  assert.ok(mixed.every((item) => products.includes(item)));
});

test("is deterministic for the same catalogue, seed, recent IDs, and previous opening", () => {
  const products = catalogue({ tops: 20, footwear: 6, "smart-casual": 8 });
  const options = {
    seed: 0,
    newArrivalIds: ids(products.slice(0, 8)),
    previousOpeningIds: ids(products.slice(10, 22)),
  };
  assert.deepEqual(createProductMix(products, options), createProductMix(products, options));
});

test("equivalent data in new objects and reversed API order does not reshuffle", () => {
  const products = catalogue({ tops: 20, footwear: 6, "smart-casual": 8 });
  const options = { seed: 42, newArrivalIds: ids(products.slice(0, 8)) };
  const refreshed = [...products].reverse().map((item) => ({ ...item }));
  assert.deepEqual(ids(createProductMix(products, options)), ids(createProductMix(refreshed, options)));
});

test("different controlled seeds vary both product choices and category order", () => {
  const products = catalogue(Object.fromEntries(CATEGORIES.map(({ id }) => [id, 10])));
  const mixes = [1, 42, 2026].map((seed) => opening(createProductMix(products, { seed })));
  assert.equal(new Set(mixes.map((items) => JSON.stringify(sortedIds(items)))).size, 3);
  assert.equal(new Set(mixes.map((items) => items.map((item) => item.category).join(","))).size, 3);
});

test("prefers products outside the initial eight arrivals without excluding any products", () => {
  const products = catalogue({ tops: 24 });
  const newArrivalIds = ids(products.slice(0, 8));
  const mixed = createProductMix(products, { seed: 3, newArrivalIds });
  assert.ok(opening(mixed).every((item) => !newArrivalIds.includes(item.id)));
  assertRecencyPreference(mixed, newArrivalIds);
  assertBalancedPermutation(mixed, products);
});

test("category coverage takes precedence when a category only contains a new arrival", () => {
  const products = catalogue({ tops: 20, footwear: 1 });
  const shoe = products.at(-1);
  const newArrivalIds = [shoe.id, ...ids(products.slice(0, 7))];
  const mixed = createProductMix(products, { seed: 5, newArrivalIds });
  assert.ok(mixed.slice(0, 2).includes(shoe));
  assertRecencyPreference(mixed, newArrivalIds);
  assertBalancedPermutation(mixed, products);
});

test("prefers unseen picks within each category on the next visit", () => {
  const products = catalogue(Object.fromEntries(CATEGORIES.map(({ id }) => [id, 2])));
  const first = createProductMix(products, { seed: 2 });
  const previousOpeningIds = ids(opening(first));
  const second = createProductMix(products, { seed: 2, previousOpeningIds });
  assert.ok(opening(second).every((item) => !previousOpeningIds.includes(item.id)));
  assertBalancedPermutation(second, products);
});

test("repeat avoidance cannot replace older choices with recent ones merely for novelty", () => {
  const products = catalogue({ tops: 20 });
  const newArrivalIds = ids(products.slice(0, 8));
  const previousOpeningIds = ids(opening(createProductMix(products, { seed: 1, newArrivalIds })));
  const mixed = createProductMix(products, { seed: 1, newArrivalIds, previousOpeningIds });
  assert.deepEqual(sortedIds(opening(mixed)), [...previousOpeningIds].sort());
  assert.notDeepEqual(ids(opening(mixed)), previousOpeningIds);
  assertRecencyPreference(mixed, newArrivalIds);
});

test("bounded retries and the partial-round fallback change a repeated opening selection", () => {
  const products = catalogue({ tops: 1, footwear: 6, "campus-casual": 6 });
  const omitted = "campus-casual-05";
  const previousOpeningIds = ids(products.filter((item) => item.id !== omitted));
  const newArrivalIds = ids(products.filter((item) => item.category !== "campus-casual" || item.id === omitted));
  assert.equal(newArrivalIds.length, 8);

  for (let seed = 0; seed < 64; seed++) {
    const mixed = createProductMix(products, { seed, newArrivalIds, previousOpeningIds });
    assert.notDeepEqual(sortedIds(opening(mixed)), [...previousOpeningIds].sort(), `seed ${seed}`);
    assertBalancedPermutation(mixed, products);
    assertRecencyPreference(mixed, newArrivalIds);
  }
});

test("partial-round retries and fallback never trade an older pick for a new arrival", () => {
  const products = [
    ...["A1", "A2", "A3", "A4"].map((id) => product(id, "tops")),
    ...["B1", "B2", "B3", "B4"].map((id) => product(id, "footwear")),
    ...["C1", "C2", "C3", "C4"].map((id) => product(id, "jackets-hoodies")),
    ...["D1", "D2"].map((id) => product(id, "trousers-jeans")),
    ...["E1", "E2"].map((id) => product(id, "watches-accessories")),
  ];
  const newArrivalIds = ["A4", "B4", "C3", "C4", "D1", "D2", "E1", "E2"];
  const previousOpeningIds = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "D1", "D2", "E1", "E2"];
  for (const seed of [98, ...Array.from({ length: 64 }, (_, i) => i)]) {
    const mixed = createProductMix(products, { seed, newArrivalIds, previousOpeningIds });
    assert.deepEqual(sortedIds(opening(mixed)), [...previousOpeningIds].sort(), `seed ${seed}`);
    assert.notDeepEqual(ids(opening(mixed)), previousOpeningIds);
    assertBalancedPermutation(mixed, products);
    assertRecencyPreference(mixed, newArrivalIds);
  }
});

test("order fallback reverses a forced two-product selection without dropping either item", () => {
  const products = [product("a"), product("b")];
  for (let seed = 0; seed < 64; seed++) {
    const mixed = createProductMix(products, {
      seed,
      newArrivalIds: ["a", "b"],
      previousOpeningIds: ["a", "b"],
    });
    assert.deepEqual(ids(mixed), ["b", "a"], `seed ${seed}`);
  }
});

test("changes order when every category has just one product", () => {
  const products = catalogue({ tops: 1, footwear: 1, "campus-casual": 1 });
  const previousOpeningIds = ids(products);
  for (let seed = 0; seed < 64; seed++) {
    const mixed = createProductMix(products, { seed, previousOpeningIds });
    assert.notDeepEqual(ids(mixed), previousOpeningIds, `seed ${seed}`);
    assertBalancedPermutation(mixed, products);
  }
});

test("normalizes legacy category aliases before balancing", () => {
  const products = [
    product("top", "tops"), product("sleeves", "longsleeves"),
    product("jacket", "jackets-hoodies"), product("hoodie", "hoodies"),
    product("outerwear", "outerwear"), product("jeans", "trousers-jeans"),
    product("bottoms", "bottoms"), product("joggers", "joggers"),
  ];
  const mixed = createProductMix(products, { seed: 8 });
  assert.equal(new Set(mixed.slice(0, 3).map((item) => normalizeCategory(item.category))).size, 3);
  assertBalancedPermutation(mixed, products);
});

test("pagination only extends the stable prefix, up to the entire catalogue", () => {
  const products = catalogue({ tops: 33, footwear: 10, "campus-casual": 15 });
  const options = { seed: 1234, newArrivalIds: ids(products.slice(0, 8)) };
  const mixed = createProductMix(products, options);
  let visible = [];
  for (let shown = 12; shown < products.length + 12; shown += 12) {
    const next = createProductMix([...products], options).slice(0, shown);
    assert.deepEqual(next.slice(0, visible.length), visible);
    assert.equal(new Set(ids(next)).size, next.length);
    visible = next;
  }
  assert.deepEqual(visible, mixed);
});

test("real product updates use fresh objects without reordering unchanged membership", () => {
  const products = catalogue({ tops: 15, footwear: 4 });
  const options = { seed: 5 };
  const first = createProductMix(products, options);
  const refreshed = products.map((item) => ({ ...item, price: item.price + 200, inStock: false }));
  const second = createProductMix(refreshed, options);
  assert.deepEqual(ids(first), ids(second));
  assert.ok(second.every((item) => item.price === 5200 && !item.inStock && refreshed.includes(item)));

  const removed = refreshed.slice(1);
  assertBalancedPermutation(createProductMix(removed, options), removed);
});

test("handles empty, singleton, and sparse catalogues without placeholders", () => {
  assert.deepEqual(createProductMix([], { seed: 1, previousOpeningIds: ["gone"] }), []);
  const only = product("only");
  assert.deepEqual(createProductMix([only], { seed: 1, previousOpeningIds: [only.id] }), [only]);
  const sparse = catalogue({ tops: 2, athleisure: 1 });
  const mixed = createProductMix(sparse, { seed: 1 });
  assert.equal(opening(mixed).length, 3);
  assertBalancedPermutation(mixed, sparse);
});

test("handles previous openings from a different catalogue without excluding new inventory", () => {
  const products = catalogue({ tops: 14, footwear: 4 });
  const mixed = createProductMix(products, { seed: 4, previousOpeningIds: ["deleted", "stale"] });
  assertBalancedPermutation(mixed, products);
});
