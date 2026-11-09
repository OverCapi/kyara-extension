// Card rarities. The site marks each card with an inline box-shadow in its rarity's color
// (CSS variables --C/--U/--R/--E/--L/--M): the rarity is recovered from that color, which
// works whatever the site's language. Fallback when the color is not recognized (the site changed how it
// paints cards): the rarity name the site writes under the offered card ("Rare · Gate").
// Read only: no side effects.
import type { Offer } from "./dom";

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;
export type Rarity = (typeof RARITIES)[number];

/** The site's CSS variable and fallback color (values taken from the site) for each rarity. */
const SITE_COLORS: Record<Rarity, { name: string; fallback: string }> = {
  common: { name: "--C", fallback: "#b5b1bb" },
  uncommon: { name: "--U", fallback: "#3fbf7f" },
  rare: { name: "--R", fallback: "#4d9bff" },
  epic: { name: "--E", fallback: "#b072ff" },
  legendary: { name: "--L", fallback: "#f5c518" },
  mythic: { name: "--M", fallback: "#ff4d2e" },
};

const COLOR = /rgba?\([^)]*\)|#[0-9a-f]{3,8}/i;

/** First color (rgb/rgba/hex) of a `box-shadow` value, or `null`. */
export function rarityColor(boxShadow: string): string | null {
  return boxShadow.match(COLOR)?.[0] ?? null;
}

/** CSS color of a rarity, for use in a CSS property: the site's variable, otherwise the fallback. */
export function rarityCssColor(rarity: Rarity): string {
  const { name, fallback } = SITE_COLORS[rarity];
  return `var(${name}, ${fallback})`;
}

/** "r,g,b" of an `rgb()`, `rgba()` or `#rrggbb` / `#rgb` color, `null` if unreadable. */
export function rgbKey(color: string): string | null {
  const rgb = color.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgb) return `${rgb[1]},${rgb[2]},${rgb[3]}`;
  const hex = color.trim().match(/^#([0-9a-f]{6}|[0-9a-f]{3})/i)?.[1];
  if (!hex) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)).join(",");
}

/** Colors ("r,g,b" key) -> rarity, from the site's CSS variables, otherwise the fallback colors. */
export function rarityPalette(root: Element = document.documentElement): Map<string, Rarity> {
  const styles = getComputedStyle(root);
  const palette = new Map<string, Rarity>();
  for (const rarity of RARITIES) {
    const { name, fallback } = SITE_COLORS[rarity];
    const key = rgbKey(styles.getPropertyValue(name)) ?? rgbKey(fallback);
    if (key) palette.set(key, rarity);
  }
  return palette;
}

/** The site's rarity names (French site), longest first: "peu commune" before "commune". */
const SITE_NAMES: Array<[string, Rarity]> = [
  ["peu commune", "uncommon"],
  ["commune", "common"],
  ["rare", "rare"],
  ["épique", "epic"],
  ["légendaire", "legendary"],
  ["mythique", "mythic"],
];
const NAME_RE = new RegExp(`(?:^|[^\\p{L}])(${SITE_NAMES.map(([n]) => n).join("|")})\\s*·`, "iu");

/** Rarity written in an offer's text ("Rare · Gate", first one = the offered card's), `null` if none. */
export function rarityFromText(text: string): Rarity | null {
  const name = NAME_RE.exec(text)?.[1]?.toLowerCase();
  return SITE_NAMES.find(([n]) => n === name)?.[1] ?? null;
}

/** Rarity of an offer's offered card: from its color, otherwise from the offer's text. `null` if unknown. */
export function offerRarity(offer: Offer, palette: Map<string, Rarity>): Rarity | null {
  if (!offer.give) return null;
  const key = rgbKey(rarityColor(offer.give.el.querySelector("img")?.style.boxShadow ?? "") ?? "");
  return (key ? palette.get(key) : undefined) ?? rarityFromText(offer.li.textContent ?? "");
}
