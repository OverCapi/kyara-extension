// Anneau autour de chaque carte d'une offre, à la couleur officielle de sa rareté.
// Le site met déjà cette couleur (--C/--U/--R/--E/--L/--M) dans le box-shadow inline de l'image,
// mais toujours en vert pour l'anneau extérieur : on reprend la vraie couleur et le CSS dessine l'anneau.
// Effet DOM : attribut data-kv-rar + variable CSS --kv-rar sur le lien de la carte.
import type { Card } from "../../kyara/dom";
import { offerCards } from "../../kyara/dom";
import type { Feature } from "../types";
import "./style.css";

const COLOR = /rgba?\([^)]*\)|#[0-9a-f]{3,8}/i;

/** Première couleur (rgb/rgba/hex) d'une valeur `box-shadow`, ou `null`. */
export function rarityColor(boxShadow: string): string | null {
  return boxShadow.match(COLOR)?.[0] ?? null;
}

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
      for (const offer of offers) if (offer.give) offerCards(offer).forEach(paintRing);
    });
  },
};
