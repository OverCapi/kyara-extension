// Instantané des offres de la page : offres lues + prix connus + cartes possédées.
// Construit UNE fois par rendu (une seule lecture du stockage), puis donné à toutes les features
// et au module fair-play.
import { type OwnedCards, type PriceStore, readPrices } from "../core/storage";
import type { CollectionLoader } from "./collection";
import { type Offer, offerIds, readOffers } from "./dom";

export interface OffersSnapshot {
  offers: Offer[];
  store: PriceStore;
  /** `null` = collection inconnue. */
  owned: OwnedCards | null;
}

const EMPTY: OffersSnapshot = { offers: [], store: { fair: {}, market: {} }, owned: null };

/** Lit la page et le stockage. Sans offre affichée : instantané vide (aucun accès au stockage ni au réseau). */
export async function buildSnapshot(collection: CollectionLoader): Promise<OffersSnapshot> {
  const offers = readOffers();
  if (!offers.length) return EMPTY;
  const owned = await collection.load();
  const ids = [...new Set(offers.flatMap(offerIds))];
  return { offers, owned, store: await readPrices(ids) };
}
