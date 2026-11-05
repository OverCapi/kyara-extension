// Valeur d'une carte et analyse de rentabilité d'une offre. Fonctions pures (aucun DOM, aucun réseau).
import type { OwnedCards, PriceStore } from "../core/storage";
import type { Card, Offer } from "./dom";

/** Valeur d'une carte : prix fair-play du site d'abord, sinon médiane marché (7 j, 30 j, dernier prix). */
export function cardValue(store: PriceStore, id: number): number | null {
  const fair = store.fair[id];
  if (fair) return fair.v;
  const p = store.market[id];
  return p ? (p.m7 ?? p.m30 ?? p.last ?? null) : null;
}

/** Une carte demandée : sa valeur et ce que tu gagnes à donner la carte proposée contre elle. */
export interface WantAnalysis {
  card: Card;
  /** Valeur de la carte demandée (W), `null` si inconnue. */
  value: number | null;
  /** G - W : positif = tu gagnes. `null` si G ou W est inconnu. */
  diff: number | null;
}
export interface OfferAnalysis {
  /** Valeur de la carte proposée (G), `null` si inconnue. */
  give: number | null;
  wants: WantAnalysis[];
  /** Meilleur gain relatif (G - W) / max(W, 1) parmi les cartes demandées que TU possèdes. `null` si aucune. */
  bestRatio: number | null;
}

/** Calcule valeurs, gains et meilleur gain relatif d'une offre. */
export function analyzeOffer(offer: Offer, store: PriceStore, owned: OwnedCards | null): OfferAnalysis {
  const give = offer.give ? cardValue(store, offer.give.id) : null;
  let bestRatio: number | null = null;
  const wants = offer.wants.map((card): WantAnalysis => {
    const value = cardValue(store, card.id);
    const diff = give === null || value === null ? null : give - value;
    if (diff !== null && value !== null && (owned?.[card.id] ?? 0) > 0) {
      bestRatio = Math.max(bestRatio ?? Number.NEGATIVE_INFINITY, diff / Math.max(value, 1));
    }
    return { card, value, diff };
  });
  return { give, wants, bestRatio };
}
