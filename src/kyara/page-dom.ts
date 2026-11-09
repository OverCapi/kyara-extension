// Page elements of kyara.games other than the offers (see dom.ts): filter bar, offer board, "load more"
// button, booster count picker and the cost tag of the "Ouvrir" button.
// Same rule as dom.ts: the site's current markup first, then a fallback based on structure or text.
// Read only, no side effects.
import { findOfferItems } from "./dom";

/** Filter bar of the Trades tab: the bar (search + pills) and the row of the site's pills. */
export interface OfferFilters {
  bar: HTMLElement;
  pills: HTMLElement;
}

/** Toggle buttons of the site (pills), the extension's own ones left out. */
const sitePills = (root: Element) =>
  [...root.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")].filter((b) => !b.closest(".kv-menu"));

/**
 * Filter bar of the Trades tab. Site markup: `.filters > .pills`. Fallback: the closest ancestor of the
 * search field holding at least 2 toggle buttons; the pills row is their parent. `null` if missing.
 */
export function findOfferFilters(root: ParentNode = document): OfferFilters | null {
  const pills = root.querySelector<HTMLElement>(".filters > .pills");
  if (pills?.parentElement) return { bar: pills.parentElement, pills };
  const search = root.querySelector('input[type="search"]');
  for (let el = search?.parentElement; el; el = el.parentElement) {
    const found = sitePills(el);
    const row = found[0]?.parentElement;
    if (found.length >= 2 && row) return { bar: el, pills: row };
  }
  return null;
}

/** List holding the offers, `null` without any offer. */
const offerList = (root: ParentNode) => findOfferItems(root)[0]?.parentElement ?? null;

/** Board holding the offer list and the load more button: `.board`, otherwise the list's parent. */
export function findOfferBoard(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(".board") ?? offerList(root)?.parentElement ?? null;
}

/**
 * "Voir plus d'offres" (load more) button, `null` when there is nothing left to load. Site markup:
 * `.board > button.more`. Fallback: a button after the offer list whose text says "plus" / "more"
 * (it is clicked automatically: never guess without the text).
 */
export function findLoadMore(root: ParentNode = document): HTMLButtonElement | null {
  const marked = root.querySelector<HTMLButtonElement>(".board > button.more");
  if (marked) return marked;
  for (let el = offerList(root)?.nextElementSibling; el; el = el.nextElementSibling) {
    if (el instanceof HTMLButtonElement && /\b(plus|more)\b/i.test(el.textContent ?? "")) return el;
  }
  return null;
}

/** A "×N" option of the booster count picker. */
export interface CountOption {
  el: HTMLButtonElement;
  n: number;
}
/** Booster count picker of a /ouvrir page ("×1 ×5 ×10"): its group and its options. */
export interface CountPicker {
  group: HTMLElement;
  options: CountOption[];
}

const countOf = (el: Element) => Number(/^×\s*(\d+)$/.exec((el.textContent ?? "").trim())?.[1] ?? Number.NaN);

/**
 * The site's booster count picker: the first `role="group"` whose buttons are all "×N".
 * Found by its content, not by its classes (they change with each site build). The extension's own
 * option (`data-kv-free`) is left out. `null` if missing.
 */
export function findCountPicker(root: ParentNode = document): CountPicker | null {
  for (const group of root.querySelectorAll<HTMLElement>('[role="group"]')) {
    const buttons = [...group.querySelectorAll<HTMLButtonElement>(":scope > button:not([data-kv-free])")];
    const options = buttons.map((el) => ({ el, n: countOf(el) }));
    if (options.length > 0 && options.every((o) => Number.isInteger(o.n))) return { group, options };
  }
  return null;
}

/**
 * "Ouvrir ×5" (open) button. Site markup: `.btn-open`. Fallback: the first button that follows the count
 * picker. `null` if missing.
 */
export function findOpenButton(root: ParentNode = document): HTMLButtonElement | null {
  const marked = root.querySelector<HTMLButtonElement>(".btn-open");
  if (marked) return marked;
  for (let el = findCountPicker(root)?.group.nextElementSibling; el; el = el.nextElementSibling) {
    if (el instanceof HTMLButtonElement) return el;
  }
  return null;
}

/**
 * Cost tag of the open button ("Gratuit · 2 restants"). Site markup: `.tag`. Fallback: the last element
 * inside the button. `null` if missing.
 */
export function findOpenCostTag(root: ParentNode = document): HTMLElement | null {
  const button = findOpenButton(root);
  const tag = button?.querySelector(".tag") ?? button?.lastElementChild;
  return tag instanceof HTMLElement ? tag : null;
}
