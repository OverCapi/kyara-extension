// Fond de chaque offre teinté du bleu (gain) au rouge (perte), selon le meilleur gain relatif parmi
// TES cartes demandées, plus la pastille on/off (toggle.ts). Effet DOM : variable CSS --kv-bg sur le <li>.
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
