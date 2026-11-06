// Value badge on each card of an offer (Trades tab).
//   offered card : "≈ G◆"  (nothing if the value is unknown)
//   wanted cards : signed "G - W", what you gain by giving G to receive W
//                  (or "W◆" if only G is unknown, nothing if W is unknown)
// No node added to the site's DOM: only data-kv / data-kv-sign, displayed by CSS.
import { t } from "../../core/i18n";
import { analyzeOffer, type WantAnalysis } from "../../kyara/prices";
import type { Feature } from "../types";
import "./style.css";

/** Badge text of the offered card. Empty if the value is unknown (no badge). */
export function giveBadge(give: number | null): string {
  return give === null ? "" : t("badge.give", { value: give });
}

/** Text and sign ("1", "-1" or "0") of a wanted card's badge. Empty text = no badge. */
export function wantBadge({ value, diff }: WantAnalysis): { text: string; sign: string } {
  if (diff === null) return { text: value === null ? "" : t("badge.value", { value }), sign: "0" };
  return { text: (diff > 0 ? "+" : "") + diff, sign: String(Math.sign(diff)) };
}

/** Sets the badge, or removes it if `text` is empty (unknown value: show nothing). */
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
