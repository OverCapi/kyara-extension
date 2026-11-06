// "Donner <card>" (give) buttons of each offer: more compact, labelled with the gain in ◆ and in %, and
// sorted from most to least profitable (unknown gain last, other buttons after them).
// DOM effect: data-kv-give / data-kv-gain / data-kv-sign attributes and `order` style on the site's buttons.

import { t } from "../../core/i18n";
import { rankByGain } from "../../core/rank";
import { readGiveButtons } from "../../kyara/dom";
import { analyzeOffer, pctText, signed, type WantAnalysis } from "../../kyara/prices";
import type { Feature } from "../types";
import "./style.css";

/** Label of a give button ("+2◆ · +40 %"). Empty if the gain is unknown. */
export function gainLabel(want: WantAnalysis | undefined): string {
  if (want?.diff == null || want.ratio === null) return "";
  return t("badge.gain", { diff: signed(want.diff), pct: pctText(want.ratio) });
}

export const giveButtons: Feature = {
  name: "give-buttons",
  setup(ctx) {
    ctx.onOffers(({ offers, store, owned }) => {
      for (const offer of offers) {
        const buttons = readGiveButtons(offer);
        if (!buttons.length) continue;
        const { wants } = analyzeOffer(offer, store, owned);
        const analyses = buttons.map((b) => wants.find((w) => w.card === b.card));
        const rank = rankByGain(analyses.map((w) => w?.ratio ?? null));
        buttons.forEach(({ el }, i) => {
          const label = gainLabel(analyses[i]);
          el.toggleAttribute("data-kv-give", true);
          el.style.order = String(rank[i]);
          if (!label) {
            delete el.dataset.kvGain;
            delete el.dataset.kvSign;
            return;
          }
          el.dataset.kvGain = label;
          el.dataset.kvSign = String(Math.sign(analyses[i]?.diff ?? 0));
        });
      }
    });
  },
};
