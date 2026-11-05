// Chef d'orchestre du content script : à chaque changement de la page (debounce 300 ms), construit
// l'instantané des offres UNE fois, place le panneau de filtres, le donne à chaque feature, puis demande
// les prix manquants.
// Chaque feature est isolée par safe() : si l'une plante, les autres continuent.
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

/** Posé sur chaque offre une fois traitée par les features. Les filtres cachent (CSS) les offres sans cet attribut. */
export const SEEN_ATTR = "data-kv-seen";

/** Démarre toutes les features sur la page courante. */
export function startFeatures(page: PageContext, features: Feature[]): void {
  const watcher = createPageWatcher(page);
  const listeners: Array<(snapshot: OffersSnapshot) => void> = [];
  const filters = createFilterPanel(page);

  for (const feature of features) {
    const ctx: FeatureContext = {
      page,
      filters,
      onOffers: (cb) => void listeners.push(safe(`feature:${feature.name}`, cb)),
    };
    safe(`feature:${feature.name}:setup`, feature.setup)(ctx);
  }

  const collection = createCollectionLoader();
  const fairPlay = createFairPlayRequester();
  watcher.subscribe(async () => {
    const snapshot = await buildSnapshot(collection);
    safe("runtime:panel", filters.attach)(findOfferFilters());
    for (const listener of listeners) listener(snapshot);
    // filtres et tri ont fini : les offres peuvent s'afficher (voir data-kv-hold-* / data-kv-filter-*)
    for (const { li } of snapshot.offers) li.setAttribute(SEEN_ATTR, "");
    fairPlay.request(snapshot, watcher.trigger);
  });
  watcher.trigger();
  log.debug("chargé sur", location.href);
}
