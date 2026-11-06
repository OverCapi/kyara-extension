// Automatic "Voir plus d'offres" (load more): when a filter is on and too few offers stay visible,
// clicks the site's button (one click per page update) until there are enough, or until there is
// nothing left to load. The button shows a loading text during each load (label.ts).
// Register AFTER the filter features: it counts what they hid.
// DOM effect: clicks on the site's button + button text changed while loading. No request of its own: the site loads.
// ponytail: fixed minimum and cap; expose them in the panel if tuning them becomes useful.
import { findLoadMore } from "../../kyara/dom";
import type { Feature } from "../types";
import { countVisible, isFiltering } from "./count";
import { watchLoadMoreLabel } from "./label";

/** Number of visible offers to reach. */
export const MIN_VISIBLE = 10;
/** Maximum consecutive automatic clicks (25 x ~20 offers): avoids draining the API when the filter finds nothing. */
export const MAX_AUTO_LOADS = 25;
/** The site's button stays enabled while loading: wait this long before clicking again without a result
 * (and before restoring its original text). */
export const LOAD_TIMEOUT = 10_000;

export const loadMore: Feature = {
  name: "load-more",
  setup(ctx) {
    const arrived = watchLoadMoreLabel(ctx.page, LOAD_TIMEOUT);
    let autoLoads = 0;
    let pending: { total: number; at: number } | null = null;
    // end of automatic loading: nothing is awaited
    const stop = () => {
      pending = null;
    };

    ctx.onOffers(({ offers }) => {
      arrived(offers.length); // before a possible new click, which sets the loading text again
      if (!isFiltering() || countVisible(offers) >= MIN_VISIBLE) {
        autoLoads = 0;
        return stop();
      }
      const waiting = pending && offers.length === pending.total && Date.now() - pending.at < LOAD_TIMEOUT;
      if (waiting) return; // loading in progress
      const more = findLoadMore();
      if (!more || autoLoads >= MAX_AUTO_LOADS || document.visibilityState !== "visible") return stop();
      autoLoads++;
      pending = { total: offers.length, at: Date.now() };
      more.click();
    });
  },
};
