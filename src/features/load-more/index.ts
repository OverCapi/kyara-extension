// Automatic "Voir plus d'offres" (load more) while a filter is on, so that loading always shows something:
// - at page load (or after a filter change), until MIN_VISIBLE offers are visible;
// - after each user click on the button, until MIN_VISIBLE NEW offers are visible.
// One click per page update, until the goal is reached, nothing is left to load, or MAX_AUTO_LOADS.
// When such a round ends without any new visible offer, a "no offer matches" notice shows under the list.
// Waits for the fair-play prices of the offers already there before loading more.
// The button shows a loading text during each load (label.ts).
// Register AFTER the filter features: it counts what they hid.
// DOM effect: clicks on the site's button, button text while loading, data-kv-empty on the offer board.
// ponytail: fixed minimum and cap; expose them in the panel if tuning them becomes useful.
import { listen } from "../../core/page";
import { findLoadMore } from "../../kyara/dom";
import type { Feature } from "../types";
import { countVisible, isFiltering } from "./count";
import { watchLoadMoreLabel } from "./label";
import { createEmptyNotice } from "./notice";
import "./style.css";

/** Number of visible offers to reach at load, and number of new visible offers after a user click. */
export const MIN_VISIBLE = 10;
/** Maximum automatic clicks per round (25 x ~20 offers): avoids draining the API when the filter finds nothing. */
export const MAX_AUTO_LOADS = 25;
/** The site's button stays enabled while loading: wait this long before clicking again without a result
 * (and before restoring its original text). */
export const LOAD_TIMEOUT = 10_000;

/** A loading round: visible offers when it started, visible offers to reach, automatic clicks done. */
interface Round {
  start: number;
  target: number;
  loads: number;
}
const baseRound = (visible: number): Round => ({ start: visible, target: MIN_VISIBLE, loads: 0 });

export const loadMore: Feature = {
  name: "load-more",
  setup(ctx) {
    const arrived = watchLoadMoreLabel(ctx.page, LOAD_TIMEOUT);
    const notice = createEmptyNotice(ctx.page);
    let visible = 0;
    let round = baseRound(0);
    let pending: { total: number; at: number } | null = null;
    let autoClick = false;

    // a user click on the button starts a new round: MIN_VISIBLE more visible offers
    listen<MouseEvent>(
      ctx.page,
      document,
      "click",
      (event) => {
        const more = findLoadMore();
        if (autoClick || !more || !(event.target instanceof Node) || !more.contains(event.target)) return;
        round = { start: visible, target: visible + MIN_VISIBLE, loads: 0 };
        notice.set(false);
      },
      { capture: true },
    );

    ctx.onOffers(({ offers }) => {
      arrived(offers.length); // before a possible new click, which sets the loading text again
      visible = countVisible(offers);
      if (!isFiltering()) {
        round = baseRound(visible);
        pending = null;
        return notice.set(false);
      }
      if (visible > round.start) notice.set(false);
      if (visible >= round.target) {
        round = baseRound(visible);
        pending = null;
        return;
      }
      const waiting = pending && offers.length === pending.total && Date.now() - pending.at < LOAD_TIMEOUT;
      // loading in progress, tab hidden, or prices on their way: offers hidden for lack of a price may
      // show up once priced, so loading more now would load too much (the fair-play reply re-renders)
      if (waiting || document.visibilityState !== "visible" || ctx.pricesPending()) return;
      const more = findLoadMore();
      if (!more || round.loads >= MAX_AUTO_LOADS) {
        pending = null;
        return notice.set(visible <= round.start); // round over: tell when it brought nothing
      }
      round.loads++;
      pending = { total: offers.length, at: Date.now() };
      autoClick = true;
      more.click();
      autoClick = false;
    });
  },
};
