// Badge de valeur sur chaque carte d'une offre (onglet Échanges).
//   carte proposée   : "≈ G◆"  (rien si la valeur est inconnue)
//   cartes demandées : "G - W" signé, ce que tu gagnes si tu donnes G pour recevoir W
//                      (ou "W◆" si seul G est inconnu, rien si W est inconnu)
// Aucun nœud ajouté dans le DOM du site : seulement data-kv / data-kv-sign, affichés par le CSS.
import { t } from "../../core/i18n";
import { analyzeOffer, type WantAnalysis } from "../../kyara/prices";
import type { Feature } from "../types";
import "./style.css";

/** Texte du badge de la carte proposée. Vide si la valeur est inconnue (pas de badge). */
export function giveBadge(give: number | null): string {
  return give === null ? "" : t("badge.give", { value: give });
}

/** Texte et signe ("1", "-1" ou "0") du badge d'une carte demandée. Texte vide = pas de badge. */
export function wantBadge({ value, diff }: WantAnalysis): { text: string; sign: string } {
  if (diff === null) return { text: value === null ? "" : t("badge.value", { value }), sign: "0" };
  return { text: (diff > 0 ? "+" : "") + diff, sign: String(Math.sign(diff)) };
}

/** Pose le badge, ou le retire si `text` est vide (valeur inconnue : on n'affiche rien). */
function setBadge(el: HTMLElement, text: string, sign?: string): void {
  if (!text) {
    delete el.dataset.kv;
    delete el.dataset.kvSign;
    return;
  }
  el.dataset.kv = text;
  if (sign !== undefined) el.dataset.kvSign = sign;
}

export const tradeBadges: Feature = {
  name: "trade-badges",
  setup(ctx) {
    ctx.onOffers(({ offers, store, owned }) => {
      for (const offer of offers) {
        if (!offer.give) continue;
        const analysis = analyzeOffer(offer, store, owned);
        setBadge(offer.give.el, giveBadge(analysis.give));
        for (const want of analysis.wants) {
          const { text, sign } = wantBadge(want);
          setBadge(want.card.el, text, sign);
        }
      }
    });
  },
};
