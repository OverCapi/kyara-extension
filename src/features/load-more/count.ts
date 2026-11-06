// Count of visible offers. Pure function (only reads the <li> attributes).
import type { Offer } from "../../kyara/dom";

/** A filter hides an offer by setting a `data-kv-hide-<filter>` attribute on it. */
export const isHiddenByFilter = (li: Element): boolean =>
  li.getAttributeNames().some((name) => name.startsWith("data-kv-hide-"));

/** Number of offers that no filter hides. */
export function countVisible(offers: Offer[]): number {
  return offers.filter(({ li }) => !isHiddenByFilter(li)).length;
}

/** `true` if at least one filter is on (`data-kv-filter-<filter>` attribute set on <html> by the feature). */
export function isFiltering(root: Element = document.documentElement): boolean {
  return root.getAttributeNames().some((name) => name.startsWith("data-kv-filter-"));
}
