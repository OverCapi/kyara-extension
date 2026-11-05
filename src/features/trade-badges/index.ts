// Badge de valeur sur chaque carte d'une offre (onglet Échanges).
//   carte proposée   : "≈ G◆"  (ou "?" si la valeur est inconnue)
//   cartes demandées : "G - W" signé, ce que tu gagnes si tu donnes G pour recevoir W
//                      (ou "W◆" / "?" si G ou W est inconnu)
// Aucun nœud ajouté dans le DOM du site : seulement data-kv / data-kv-sign, affichés par le CSS.
import { analyzeOffer, type WantAnalysis } from "../../kyara/prices";
import type { Feature } from "../types";
import "./style.css";

/** Texte du badge de la carte proposée. */
export function giveBadge(give: number | null): string {
  return give === null ? "?" : `≈ ${give}◆`;
}

/** Texte et signe ("1", "-1" ou "0") du badge d'une carte demandée. */
export function wantBadge({ value, diff }: WantAnalysis): { text: string; sign: string } {
  if (diff === null) return { text: value === null ? "?" : `${value}◆`, sign: "0" };
  return { text: (diff > 0 ? "+" : "") + diff, sign: String(Math.sign(diff)) };
}

export const tradeBadges: Feature = {
  name: "trade-badges",
  setup(ctx) {
    ctx.onOffers(({ offers, store, owned }) => {
      for (const offer of offers) {
        if (!offer.give) continue;
        const analysis = analyzeOffer(offer, store, owned);
        offer.give.el.dataset.kv = giveBadge(analysis.give);
        for (const want of analysis.wants) {
          const { text, sign } = wantBadge(want);
          want.card.el.dataset.kv = text;
          want.card.el.dataset.kvSign = sign;
        }
      }
    });
  },
};
