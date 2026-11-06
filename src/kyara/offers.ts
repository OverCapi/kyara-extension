// Snapshot of the page's offers: offers read + known prices.
// Built ONCE per render (a single storage read), then given to every feature
// and to the fair-play module.
import { type PriceStore, readPrices } from "../core/storage";
import { type Offer, offerIds, readOffers } from "./dom";

export interface OffersSnapshot {
  offers: Offer[];
  store: PriceStore;
}

const EMPTY: OffersSnapshot = { offers: [], store: { fair: {}, market: {} } };

/** Reads the page and storage. With no offer shown: empty snapshot (no storage access). */
export async function buildSnapshot(): Promise<OffersSnapshot> {
  const offers = readOffers();
  if (!offers.length) return EMPTY;
  const ids = [...new Set(offers.flatMap(offerIds))];
  return { offers, store: await readPrices(ids) };
}
