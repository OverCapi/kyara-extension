// Card value and offer profitability analysis. Pure functions (no DOM, no network).
import type { OwnedCards, PriceStore } from "../core/storage";
import type { Card, Offer } from "./dom";

/** Value of a card: the site's fair-play price first, otherwise the market median (7 d, 30 d, last price). */
export function cardValue(store: PriceStore, id: number): number | null {
  const fair = store.fair[id];
  if (fair) return fair.v;
  const p = store.market[id];
  return p ? (p.m7 ?? p.m30 ?? p.last ?? null) : null;
}

/** A wanted card: its value and what you gain by giving the offered card for it. */
export interface WantAnalysis {
  card: Card;
  /** Value of the wanted card (W), `null` if unknown. */
  value: number | null;
  /** G - W: positive = you gain. `null` if G or W is unknown. */
  diff: number | null;
}
export interface OfferAnalysis {
  /** Value of the offered card (G), `null` if unknown. */
  give: number | null;
  wants: WantAnalysis[];
  /** Best relative gain (G - W) / max(W, 1) among the wanted cards YOU own. `null` if none. */
  bestRatio: number | null;
}

/** Computes the values, gains and best relative gain of an offer. */
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
