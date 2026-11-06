// Badges on the cards of each offer: value of the offered card ("≈ 12◆"), gain per wanted card ("+6",
// its percentage on hover), and the best percentage you can get under the ⇄ arrow ("max +40 %").
// DOM effect: data-kv* attributes only (the CSS draws the badges).
import { t } from "../../core/i18n";
import { findOfferArrow } from "../../kyara/dom";
import { analyzeOffer, pctText, signed, type WantAnalysis } from "../../kyara/prices";
import type { Feature } from "../types";
import "./style.css";

/** Badge text of the offered card. Empty if the value is unknown (no badge). */
export function giveBadge(give: number | null): string {
  return give === null ? "" : t("badge.give", { value: give });
}

/** Text and sign ("1", "-1" or "0") of a wanted card's badge. Empty text = no badge. */
export function wantBadge({ value, diff }: WantAnalysis): { text: string; sign: string } {
  if (diff === null) return { text: value === null ? "" : t("badge.value", { value }), sign: "0" };
  return { text: signed(diff), sign: String(Math.sign(diff)) };
}

/** Text of the best-gain badge under the arrow. Empty if no owned card has a known gain. */
export function maxBadge(bestRatio: number | null): string {
  return bestRatio === null ? "" : t("badge.max", { pct: pctText(bestRatio) });
}

const sign = (ratio: number | null) => (ratio === null ? undefined : String(Math.sign(ratio)));

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

/** Sets or removes a single data attribute. */
function setData(el: HTMLElement, key: string, value: string | undefined): void {
  if (value) el.dataset[key] = value;
  else delete el.dataset[key];
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
          setData(want.card.el, "kvPct", want.ratio === null ? undefined : pctText(want.ratio));
        }
        const arrow = findOfferArrow(offer);
        if (!arrow) continue;
        setData(arrow, "kvMax", maxBadge(analysis.bestRatio));
        setData(arrow, "kvSign", sign(analysis.bestRatio));
      }
    });
  },
};
