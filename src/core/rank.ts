// Rank of items from a gain, most profitable first. Pure function, used to sort offers and give buttons.

/**
 * Rank of each offer (0 = first) from its best relative gain. Unknown gain (`null`) comes
 * last. On equal gain, the site's order is kept. `ratios[i]` = gain of offer `i`; returns `rank[i]`.
 */
export function rankByGain(ratios: Array<number | null>): number[] {
  const order = ratios
    .map((ratio, index) => ({ ratio, index }))
    .sort((a, b) => {
      if (a.ratio === b.ratio) return a.index - b.index;
      if (a.ratio === null) return 1;
      if (b.ratio === null) return -1;
      return b.ratio - a.ratio;
    });
  const rank: number[] = [];
  order.forEach(({ index }, position) => {
    rank[index] = position;
  });
  return rank;
}
