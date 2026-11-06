// Snapshot of the page's offers: offers read + known prices + owned cards.
// Built ONCE per render (a single storage read), then given to every feature
// and to the fair-play module.
import { type OwnedCards, type PriceStore, readPrices } from "../core/storage";
import type { CollectionLoader } from "./collection";
import { type Offer, offerIds, readOffers } from "./dom";

export interface OffersSnapshot {
  offers: Offer[];
  store: PriceStore;
  /** `null` = unknown collection. */
  owned: OwnedCards | null;
}

const EMPTY: OffersSnapshot = { offers: [], store: { fair: {}, market: {} }, owned: null };

/** Reads the page and storage. With no offer shown: empty snapshot (no storage or network access). */
export async function buildSnapshot(collection: CollectionLoader): Promise<OffersSnapshot> {
  const offers = readOffers();
  if (!offers.length) return EMPTY;
  const owned = await collection.load();
  const ids = [...new Set(offers.flatMap(offerIds))];
  return { offers, owned, store: await readPrices(ids) };
}
