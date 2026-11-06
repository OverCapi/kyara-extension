// Content script conductor: on every page change (300 ms debounce), builds
// the offers snapshot ONCE, places the filter panel, gives the snapshot to every feature, then requests
// the missing prices.
// Each feature is isolated by safe(): if one crashes, the others go on.
import { safe } from "../core/errors";
import { createLogger } from "../core/log";
import { createPageWatcher, type PageContext } from "../core/page";
import { createCollectionLoader } from "../kyara/collection";
import { findOfferFilters } from "../kyara/dom";
import { createFairPlayRequester } from "../kyara/fair-play";
import { createFilterPanel } from "../kyara/filter-panel";
import { buildSnapshot, type OffersSnapshot } from "../kyara/offers";
import type { Feature, FeatureContext } from "./types";

const log = createLogger("runtime");

/** Set on each offer once the features have processed it. Filters hide (CSS) offers without this attribute. */
export const SEEN_ATTR = "data-kv-seen";

/** Starts every feature on the current page. */
export function startFeatures(page: PageContext, features: Feature[]): void {
  const watcher = createPageWatcher(page);
  const listeners: Array<(snapshot: OffersSnapshot) => void> = [];
  const filters = createFilterPanel(page);
  const collection = createCollectionLoader();
  const fairPlay = createFairPlayRequester();
  let current: OffersSnapshot | null = null;

  for (const feature of features) {
    const ctx: FeatureContext = {
      page,
      filters,
      onOffers: (cb) => void listeners.push(safe(`feature:${feature.name}`, cb)),
      // read during a render: the filters registered before have already marked the offers
      pricesPending: () => current !== null && fairPlay.pending(current),
    };
    safe(`feature:${feature.name}:setup`, feature.setup)(ctx);
  }

  watcher.subscribe(async () => {
    const snapshot = await buildSnapshot(collection);
    current = snapshot;
    safe("runtime:panel", filters.attach)(findOfferFilters());
    for (const listener of listeners) listener(snapshot);
    // filters and sorting are done: the offers can show (see data-kv-hold-* / data-kv-filter-*)
    for (const { li } of snapshot.offers) li.setAttribute(SEEN_ATTR, "");
    fairPlay.request(snapshot, watcher.trigger);
  });
  watcher.trigger();
  log.debug("loaded on", location.href);
}
