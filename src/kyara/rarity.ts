// Raretés des cartes. Le site marque chaque carte d'un box-shadow inline à la couleur de sa rareté
// (variables CSS --C/--U/--R/--E/--L/--M) : on retrouve la rareté à partir de cette couleur, ce qui
// marche quelle que soit la langue du site. Lecture seule : aucun effet de bord.
import type { Offer } from "./dom";

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;
export type Rarity = (typeof RARITIES)[number];

/** Variable CSS du site et couleur de secours (valeurs relevées sur le site) de chaque rareté. */
const SITE_COLORS: Record<Rarity, { name: string; fallback: string }> = {
  common: { name: "--C", fallback: "#b5b1bb" },
  uncommon: { name: "--U", fallback: "#3fbf7f" },
  rare: { name: "--R", fallback: "#4d9bff" },
  epic: { name: "--E", fallback: "#b072ff" },
  legendary: { name: "--L", fallback: "#f5c518" },
  mythic: { name: "--M", fallback: "#ff4d2e" },
};

const COLOR = /rgba?\([^)]*\)|#[0-9a-f]{3,8}/i;

/** Première couleur (rgb/rgba/hex) d'une valeur `box-shadow`, ou `null`. */
export function rarityColor(boxShadow: string): string | null {
  return boxShadow.match(COLOR)?.[0] ?? null;
}

/** Couleur CSS d'une rareté, à poser dans une propriété CSS : variable du site, sinon secours. */
export function rarityCssColor(rarity: Rarity): string {
  const { name, fallback } = SITE_COLORS[rarity];
  return `var(${name}, ${fallback})`;
}

/** "r,g,b" d'une couleur `rgb()`, `rgba()` ou `#rrggbb` / `#rgb`, `null` si illisible. */
export function rgbKey(color: string): string | null {
  const rgb = color.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgb) return `${rgb[1]},${rgb[2]},${rgb[3]}`;
  const hex = color.trim().match(/^#([0-9a-f]{6}|[0-9a-f]{3})/i)?.[1];
  if (!hex) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)).join(",");
}

/** Couleurs (clé "r,g,b") -> rareté, d'après les variables CSS du site, sinon les couleurs de secours. */
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

/** Rareté de la carte proposée d'une offre, `null` si inconnue (pas de carte, pas de couleur reconnue). */
export function offerRarity(offer: Offer, palette: Map<string, Rarity>): Rarity | null {
  const shadow = offer.give?.el.querySelector("img")?.style.boxShadow ?? "";
  const key = rgbKey(rarityColor(shadow) ?? "");
  return key ? (palette.get(key) ?? null) : null;
}
