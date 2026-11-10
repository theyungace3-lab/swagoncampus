import { normalizeCategory } from "./products";
import type { Product } from "./types";

export const ALL_PRODUCTS_PAGE_SIZE = 12;

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** A repeatable, category-balanced permutation of the current catalogue. */
export function createProductMix(
  products: readonly Product[],
  {
    seed,
    newArrivalIds = [],
    previousOpeningIds = [],
  }: {
    seed: number;
    newArrivalIds?: readonly string[];
    previousOpeningIds?: readonly string[];
  }
): Product[] {
  const unique = [...new Map(products.map((product) => [product.id, product])).values()]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (unique.length < 2) return unique;

  const recent = new Set(newArrivalIds);
  const previous = new Set(previousOpeningIds);
  const byCategory = new Map<string, Product[]>();
  for (const product of unique) {
    const category = normalizeCategory(product.category);
    const bucket = byCategory.get(category) ?? [];
    bucket.push(product);
    byCategory.set(category, bucket);
  }
  const categories = [...byCategory.keys()].sort();

  // Mulberry32 supplies deterministic draws, including for seed zero.
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const openingSize = Math.min(ALL_PRODUCTS_PAGE_SIZE, unique.length);
  let result: Product[] = [];
  let roundEnds: number[] = [];

  for (let attempt = 0; attempt < 4; attempt++) {
    let active = categories.map((category) =>
      shuffle(byCategory.get(category)!, random).sort(
        (a, b) =>
          Number(recent.has(a.id)) - Number(recent.has(b.id)) ||
          Number(previous.has(a.id)) - Number(previous.has(b.id))
      )
    );
    result = [];
    roundEnds = [];
    let round = 0;
    while (active.length > 0) {
      const nextRound = shuffle(active, random).map((bucket) => bucket[round]);
      if (result.length < openingSize && result.length + nextRound.length > openingSize) {
        // When only part of a round fits, avoid new arrivals before random ties.
        nextRound.sort((a, b) => Number(recent.has(a.id)) - Number(recent.has(b.id)));
      }
      result.push(...nextRound);
      roundEnds.push(result.length);
      round++;
      active = active.filter((bucket) => bucket.length > round);
    }

    if (
      previous.size !== openingSize ||
      result.slice(0, openingSize).some((product) => !previous.has(product.id))
    ) {
      return result;
    }
  }

  // Unseen IDs already lead each category's recency tier. Only equally preferred
  // heads in a partially visible round can change a repeated opening selection.
  const partialRound = roundEnds.some(
    (end, index) => (roundEnds[index - 1] ?? 0) < openingSize && end > openingSize
  );
  if (
    partialRound &&
    recent.has(result[openingSize - 1].id) === recent.has(result[openingSize].id)
  ) {
    [result[openingSize - 1], result[openingSize]] = [
      result[openingSize], result[openingSize - 1],
    ];
    return result;
  }

  if (result.slice(0, openingSize).some((product, i) => product.id !== previousOpeningIds[i])) {
    return result;
  }

  // Membership is forced: change only order, preserving rounds and recency.
  if (categories.length > 1) {
    [result[0], result[1]] = [result[1], result[0]];
  } else {
    for (let i = 0; i < openingSize - 1; i++) {
      if (recent.has(result[i].id) === recent.has(result[i + 1].id)) {
        [result[i], result[i + 1]] = [result[i + 1], result[i]];
        break;
      }
    }
  }
  return result;
}
