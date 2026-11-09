import { vi } from "vitest";
// Shared test tools.
import type { PageContext } from "../core/page";
import type { Feature } from "../features/types";
import { markOffers, readOffers } from "../kyara/dom";
import type { FilterPanel } from "../kyara/filter-panel";
import type { OffersSnapshot } from "../kyara/offers";

/** Fake page context: `invalidate()` simulates reloading the extension. */
export function fakeCtx(): PageContext & { invalidate(): void } {
  const callbacks: Array<() => void> = [];
  const ctx = {
    isValid: true,
    onInvalidated(cb: () => void) {
      callbacks.push(cb);
    },
    invalidate() {
      ctx.isValid = false;
      for (const cb of callbacks) cb();
    },
  };
  return ctx;
}

/** Replaces `fetch` with a fake that returns `body` as JSON with this status. */
export function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

export interface OfferSpec {
  /** Id of the offered card (omitted = offer without an offered card). */
  give?: number;
  wants?: number[];
  /** Inline `box-shadow` of the offered card's image (the site's rarity color). */
  shadow?: string;
  /** Wanted cards you can give: a "Donner Carte <id> ×1" button is added for each. */
  free?: number[];
  /** Other buttons under the offer (e.g. "Proposer autre chose"). */
  buttons?: string[];
}

/** Adds offers to the page with the same structure as kyara.games. Returns the <li> elements. */
export function renderOffers(specs: OfferSpec[]): HTMLElement[] {
  const card = (id: number, shadow = "") =>
    `<a href="/wiki/${id}" title="Carte ${id}"><img style="box-shadow:${shadow}"></a>`;
  return specs.map((s, i) => {
    const li = document.createElement("li");
    li.id = `offre-${i + 1}`;
    li.innerHTML =
      `<div class="thumbs"><div class="give">${s.give ? card(s.give, s.shadow) : ""}</div>` +
      `<div class="arrow">⇄</div><div class="want">${(s.wants ?? []).map((id) => card(id)).join("")}</div></div>` +
      `<div class="acts">${[...(s.free ?? []).map((id) => `Donner Carte ${id} ×1`), ...(s.buttons ?? [])]
        .map((b) => `<button>${b}</button>`)
        .join("")}</div>`;
    document.body.append(li);
    return li;
  });
}

/** Ready-to-use offers snapshot: renders the offers in the page and sets fair-play prices.
 * `free`: cards you can give, added as "Donner" buttons to every offer that wants them. */
export function makeSnapshot(
  specs: OfferSpec[],
  opts: { fair?: Record<number, number>; free?: number[] } = {},
): OffersSnapshot {
  renderOffers(specs.map((s) => ({ ...s, free: (opts.free ?? []).filter((id) => s.wants?.includes(id)) })));
  const fair = Object.fromEntries(Object.entries(opts.fair ?? {}).map(([id, v]) => [id, { v, t: 0 }]));
  const offers = readOffers();
  markOffers(offers); // like the runtime, before the features
  return { offers, store: { fair, market: {} } };
}

const startedPages: Array<ReturnType<typeof fakeCtx>> = [];

/** Invalidates the contexts of every feature started by a test (removes their listeners). */
export function stopAllFeatures(): void {
  for (const page of startedPages.splice(0)) page.invalidate();
}

/** Fake filter panel: puts categories straight into the page (tests find them there). */
export function fakePanel(): FilterPanel & { categories: Array<{ title: string; el: HTMLElement }> } {
  const categories: Array<{ title: string; el: HTMLElement }> = [];
  return {
    categories,
    attach() {},
    addCategory(title, el) {
      categories.push({ title, el });
      document.body.append(el);
    },
  };
}

/** Starts a feature with a fake context. `emit(snapshot)` simulates a page update. */
export function startFeature(feature: Feature) {
  const page = fakeCtx();
  startedPages.push(page);
  const listeners: Array<(snapshot: OffersSnapshot) => void> = [];
  const filters = fakePanel();
  const prices = { pending: false };
  feature.setup({
    page,
    filters,
    onOffers: (cb) => void listeners.push(cb),
    pricesPending: () => prices.pending,
  });
  return {
    page,
    filters,
    /** Set `prices.pending = true` to simulate fair-play prices being fetched. */
    prices,
    emit(snapshot: OffersSnapshot) {
      for (const listener of listeners) listener(snapshot);
    },
  };
}
