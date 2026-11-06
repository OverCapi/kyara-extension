// Asks the API for missing fair-play prices, with as few requests as possible:
//  - only for acceptable offers (you own at least one wanted card),
//  - only for the offered card + your wanted cards,
//  - not for offers hidden by a filter that does not depend on prices (rarity),
//  - offers hidden by the gain filter: only never-priced cards (no hourly refresh of hidden offers),
//  - in batches of 200 ids (like the site), one request at a time,
//  - price requested again after 1 h, failed id retried after 5 min,
//  - after a failed response (401, 429, 500…), no request at all for 5 min,
//  - nothing while the tab is hidden.
import { createLogger } from "../core/log";
import type { OwnedCards } from "../core/storage";
import { isFresh, type PriceStore, writeEntries } from "../core/storage";
import { kyaraFetch } from "./api";
import type { Offer } from "./dom";
import type { OffersSnapshot } from "./offers";
import { parseFair } from "./parse";

const log = createLogger("fair-play");

export const TTL = 60 * 60 * 1000; // price requested again after 1 h
export const RETRY = 5 * 60 * 1000; // failed id: no new attempt before 5 min
export const BATCH = 200;

/** Set by the gain filter, which hides on prices: its offers still need them (unknown gain = hidden). */
const GAIN_HIDE_ATTR = "data-kv-hide-gain";

/** How much of an offer's prices to request: everything stale, only never-priced cards, or nothing. */
function pricingNeed(li: Element): "stale" | "unknown" | "none" {
  const hides = li.getAttributeNames().filter((name) => name.startsWith("data-kv-hide-"));
  if (hides.some((name) => name !== GAIN_HIDE_ATTR)) return "none"; // hidden whatever its prices
  return hides.length ? "unknown" : "stale";
}

/** Ids whose price must be (re)requested, and number of acceptable offers. Pure function. */
export function findMissing(
  offers: Offer[],
  owned: OwnedCards | null,
  store: PriceStore,
  tried: Map<number, number>,
  now = Date.now(),
): { need: Set<number>; acceptable: number } {
  const need = new Set<number>();
  let acceptable = 0;
  if (!owned) return { need, acceptable };
  for (const { li, give, wants } of offers) {
    const mine = wants.filter((c) => (owned[c.id] ?? 0) > 0);
    const level = pricingNeed(li);
    if (!give || !mine.length || level === "none") continue;
    acceptable++;
    for (const { id } of [give, ...mine]) {
      const missing = level === "stale" ? !isFresh(store.fair[id], TTL, now) : !store.fair[id];
      if (missing && now - (tried.get(id) ?? 0) > RETRY) need.add(id);
    }
  }
  return { need, acceptable };
}

export interface FairPlayRequester {
  /** Starts the requests for this snapshot if needed. `onDone` is called when they are finished. */
  request(snapshot: OffersSnapshot, onDone: () => void): void;
  /** `true` while prices of this snapshot are being fetched or about to be (not when paused or tab hidden). */
  pending(snapshot: OffersSnapshot): boolean;
}

export function createFairPlayRequester(): FairPlayRequester {
  const tried = new Map<number, number>(); // id -> time of the last attempt
  let inflight = false;
  let pausedUntil = 0; // after a failed response: no request until then

  async function fetchAll(ids: number[]): Promise<void> {
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      for (const id of chunk) tried.set(id, Date.now());
      const res = await kyaraFetch(`/fair-play/prices?ids=${chunk.join(",")}`);
      log.debug(`fair-play: ${chunk.length} ids -> HTTP ${res.status}`);
      if (!res.ok) {
        pausedUntil = Date.now() + RETRY; // 429 / 401 / down: the next batches would fail too
        return;
      }
      await writeEntries(parseFair(res.data));
    }
  }

  const canRequest = () => Date.now() >= pausedUntil && document.visibilityState === "visible";

  return {
    pending({ offers, owned, store }) {
      return inflight || (canRequest() && findMissing(offers, owned, store, tried).need.size > 0);
    },
    request({ offers, owned, store }, onDone) {
      const { need, acceptable } = findMissing(offers, owned, store, tried);
      log.debug(`${offers.length} offers, ${acceptable} acceptable, ${need.size} prices to request`);
      if (!need.size) return;
      if (Date.now() < pausedUntil) return log.debug("request postponed: last response failed");
      if (inflight) return log.debug("request postponed: a request is in flight"); // rerun when it ends
      if (document.visibilityState !== "visible") return log.debug("request postponed: tab hidden");
      inflight = true;
      fetchAll([...need])
        .catch((err) => log.error("fair-play: error", err))
        .finally(() => {
          inflight = false;
          onDone(); // the list may have changed during the request (e.g. the site's "Que je peux accepter" filter)
        });
    },
  };
}
