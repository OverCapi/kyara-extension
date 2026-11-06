// Each offer's background tinted from blue (gain) to red (loss), from the best relative gain among
// YOUR wanted cards, plus the on/off pill (toggle.ts). DOM effect: --kv-bg CSS variable on the <li>.
import { analyzeOffer } from "../../kyara/prices";
import type { Feature } from "../types";
import { tintColor } from "./tint";
import { createToggle } from "./toggle";
import "./style.css";

export const profitTint: Feature = {
  name: "profit-tint",
  setup(ctx) {
    const toggle = createToggle(ctx.page);
    ctx.onOffers(({ offers, store, owned }) => {
      toggle.setVisible(offers.length > 0);
      for (const offer of offers) {
        if (!offer.give) continue;
        const { bestRatio } = analyzeOffer(offer, store, owned);
        offer.li.style.setProperty("--kv-bg", tintColor(bestRatio));
      }
    });
  },
};
