// Card values and trade profitability, shared by the badge, tint, filter and give-button features.
// Pure functions: no DOM change, no request.
import { t } from "../core/i18n";
import type { PriceStore } from "../core/storage";
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
  /** Relative gain (G - W) / max(W, 1). `null` if G or W is unknown. */
  ratio: number | null;
}
export interface OfferAnalysis {
  /** Value of the offered card (G), `null` if unknown. */
  give: number | null;
  wants: WantAnalysis[];
  /** Best relative gain among the wanted cards you can give (owned and not locked). `null` if none. */
  bestRatio: number | null;
}

/** Computes the values, gains and best relative gain of an offer. */
export function analyzeOffer(offer: Offer, store: PriceStore): OfferAnalysis {
  const give = offer.give ? cardValue(store, offer.give.id) : null;
  let bestRatio: number | null = null;
  const wants = offer.wants.map((card): WantAnalysis => {
    const value = cardValue(store, card.id);
    const diff = give === null || value === null ? null : give - value;
    const ratio = diff === null || value === null ? null : diff / Math.max(value, 1);
    if (ratio !== null && offer.free.includes(card)) {
      bestRatio = Math.max(bestRatio ?? Number.NEGATIVE_INFINITY, ratio);
    }
    return { card, value, diff, ratio };
  });
  return { give, wants, bestRatio };
}

/** Number with its sign: "+6", "-2", "0". */
export function signed(n: number): string {
  return (n > 0 ? "+" : "") + n;
}

/** Relative gain as a rounded, signed percentage ("+40 %"). */
export function pctText(ratio: number): string {
  return t("badge.pct", { pct: signed(Math.round(ratio * 100)) });
}
