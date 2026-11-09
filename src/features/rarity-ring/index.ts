// Ring around each card of an offer, in its rarity's official color.
// The site already puts that color (--C/--U/--R/--E/--L/--M) in the image's inline box-shadow,
// but the outer ring is always green: the real color is reused and CSS draws the ring.
// DOM effect: data-kv-rar attribute + --kv-rar CSS variable on the card's link, data-kv-thumbs on the row
// of wanted cards (wider gap so the rings do not touch).
import type { Card } from "../../kyara/dom";
import { findWantsRow, offerCards } from "../../kyara/dom";
import { rarityColor } from "../../kyara/rarity";
import type { Feature } from "../types";
import "./style.css";

function paintRing({ el }: Card): void {
  const color = rarityColor(el.querySelector("img")?.style.boxShadow ?? "");
  if (!color) return;
  el.style.setProperty("--kv-rar", color);
  el.dataset.kvRar = "";
}

export const rarityRing: Feature = {
  name: "rarity-ring",
  setup(ctx) {
    ctx.onOffers(({ offers }) => {
      for (const offer of offers) {
        if (!offer.give) continue;
        offerCards(offer).forEach(paintRing);
        findWantsRow(offer)?.toggleAttribute("data-kv-thumbs", true);
      }
    });
  },
};
