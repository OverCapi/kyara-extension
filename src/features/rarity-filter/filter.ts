// Règle du filtre de rareté. Fonction pure.
import type { Rarity } from "../../kyara/rarity";

/**
 * `true` si l'offre doit rester visible. Aucune rareté choisie : tout reste visible.
 * Sinon : seulement les offres dont la carte proposée est d'une des raretés choisies
 * (rareté inconnue = masquée).
 */
export function passesRarity(rarity: Rarity | null, selected: readonly Rarity[]): boolean {
  if (selected.length === 0) return true;
  return rarity !== null && selected.includes(rarity);
}

/** Garde les raretés valides d'une liste venue du stockage, dans l'ordre des raretés, sans doublon. */
export function toRarities(stored: readonly string[], all: readonly Rarity[]): Rarity[] {
  return all.filter((rarity) => stored.includes(rarity));
}
