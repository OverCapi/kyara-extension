// Asks the API for missing fair-play prices, with as few requests as possible:
//  - only for acceptable offers (you own at least one wanted card),
//  - only for the offered card + your wanted cards,
//  - in batches of 200 ids (like the site), one request at a time,
//  - price requested again after 1 h, failed id retried after 5 min,
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
  for (const { give, wants } of offers) {
    const mine = wants.filter((c) => (owned[c.id] ?? 0) > 0);
    if (!give || !mine.length) continue;
    acceptable++;
    for (const { id } of [give, ...mine]) {
      const stale = !isFresh(store.fair[id], TTL, now);
      if (stale && now - (tried.get(id) ?? 0) > RETRY) need.add(id);
    }
  }
  return { need, acceptable };
}

export interface FairPlayRequester {
  /** Starts the requests for this snapshot if needed. `onDone` is called when they are finished. */
  request(snapshot: OffersSnapshot, onDone: () => void): void;
}

export function createFairPlayRequester(): FairPlayRequester {
  const tried = new Map<number, number>(); // id -> time of the last attempt
  let inflight = false;

  async function fetchAll(ids: number[]): Promise<void> {
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      for (const id of chunk) tried.set(id, Date.now());
      const res = await kyaraFetch(`/fair-play/prices?ids=${chunk.join(",")}`);
      log.debug(`fair-play: ${chunk.length} ids -> HTTP ${res.status}`);
      if (res.ok) await writeEntries(parseFair(res.data));
    }
  }

  return {
    request({ offers, owned, store }, onDone) {
      const { need, acceptable } = findMissing(offers, owned, store, tried);
      log.debug(`${offers.length} offers, ${acceptable} acceptable, ${need.size} prices to request`);
      if (!need.size) return;
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
