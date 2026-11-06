// Rule of the rarity filter. Pure function.
import type { Rarity } from "../../kyara/rarity";

/**
 * `true` if the offer must stay visible. No rarity chosen: everything stays visible.
 * Otherwise: only offers whose offered card has one of the chosen rarities
 * (unknown rarity = hidden).
 */
export function passesRarity(rarity: Rarity | null, selected: readonly Rarity[]): boolean {
  if (selected.length === 0) return true;
  return rarity !== null && selected.includes(rarity);
}

/** Keeps the valid rarities of a list from storage, in rarity order, without duplicates. */
export function toRarities(stored: readonly string[], all: readonly Rarity[]): Rarity[] {
  return all.filter((rarity) => stored.includes(rarity));
}
