// Stats block of the profile page: marks its tiles and their parts with data-kv-stat* attributes, for the
// profile-showcase feature's CSS. Tiles are found by position (first = collection, last = rank), parts by the
// site's current markup: a part that is not found simply keeps the site's look.
// DOM effect: attributes and one CSS variable on the site's nodes. No node added, no network.

const PARTS: ReadonlyArray<readonly [selector: string, part: string]> = [
  [".kv", "value"],
  [".kt", "total"],
  [".kl", "label"],
  [".ring", "ring"],
  [".ring-bg", "ring-bg"],
  [".ring-fg", "ring-fg"],
  [".ring-p", "ring-pct"],
  [".rk-k", "seal"],
  [".rk-h b", "rank"],
  [".rk-bar", "bar"],
  [".rk-bar i", "fill"],
];

function tileKind(index: number, count: number): string {
  if (index === 0) return "coll";
  return index === count - 1 ? "rank" : "small";
}

/** Marks the stats tiles and their parts. Nothing happens on a block without tiles. */
export function markProfileStats(stats: Element): void {
  const tiles = [...stats.children];
  tiles.forEach((tile, i) => {
    tile.setAttribute("data-kv-stat", tileKind(i, tiles.length));
    if (tile instanceof HTMLElement) tile.style.setProperty("--kv-i", String(i));
    tile.toggleAttribute("data-kv-stat-accent", tile.querySelector(".kv.m") !== null);
    for (const [selector, part] of PARTS) {
      for (const el of tile.querySelectorAll(selector)) el.setAttribute("data-kv-stat-part", part);
    }
  });
}
