// Each offer's background tinted from blue (gain) to red (loss), from the best relative gain among
// YOUR wanted cards, plus the on/off pill (toggle.ts) and the color scale slider (scale.ts).
// DOM effect: --kv-bg CSS variable on the <li>. The last snapshot is kept to recolor when the scale changes.
import { t } from "../../core/i18n";
import { DEFAULT_TINT_FULL } from "../../core/storage";
import type { OffersSnapshot } from "../../kyara/offers";
import { analyzeOffer } from "../../kyara/prices";
import type { Feature } from "../types";
import { createTintScale } from "./scale";
import { tintColor } from "./tint";
import { createToggle } from "./toggle";
import "./style.css";

export const profitTint: Feature = {
  name: "profit-tint",
  setup(ctx) {
    const toggle = createToggle(ctx.page);
    let snapshot: OffersSnapshot | null = null;
    let fullPct = DEFAULT_TINT_FULL;
    const render = () => {
      if (!snapshot) return;
      const { offers, store } = snapshot;
      toggle.setVisible(offers.length > 0);
      for (const offer of offers) {
        if (!offer.give) continue;
        const { bestRatio } = analyzeOffer(offer, store);
        offer.li.style.setProperty("--kv-bg", tintColor(bestRatio, fullPct));
      }
    };
    const scale = createTintScale(ctx.page, (pct) => {
      fullPct = pct;
      render();
    });
    ctx.filters.addCategory(t("panel.cat.tint"), scale);
    ctx.onOffers((next) => {
      snapshot = next;
      render();
    });
  },
};
