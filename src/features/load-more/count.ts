// Compte des offres visibles. Fonction pure (lit seulement les attributs des <li>).
import type { Offer } from "../../kyara/dom";

/** Un filtre cache une offre en lui posant un attribut `data-kv-hide-<filtre>`. */
export const isHiddenByFilter = (li: Element): boolean =>
  li.getAttributeNames().some((name) => name.startsWith("data-kv-hide-"));

/** Nombre d'offres qu'aucun filtre ne cache. */
export function countVisible(offers: Offer[]): number {
  return offers.filter(({ li }) => !isHiddenByFilter(li)).length;
}

/** `true` si au moins un filtre est actif (attribut `data-kv-filter-<filtre>` posé sur <html> par la feature). */
export function isFiltering(root: Element = document.documentElement): boolean {
  return root.getAttributeNames().some((name) => name.startsWith("data-kv-filter-"));
}
