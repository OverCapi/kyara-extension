// Filtre de rareté : l'utilisateur choisit une ou plusieurs raretés (commune … mythique) dans le panneau
// de filtres ; seules les offres dont la carte PROPOSÉE est de cette rareté restent visibles. Aucune
// rareté choisie = toutes. Le choix est mémorisé (clé rarities) et suivi entre onglets.
// Effet DOM : attribut data-kv-hide-rarity sur le <li> (le CSS le cache).
import { safeAsync } from "../../core/errors";
import { t } from "../../core/i18n";
import { onRaritiesChange, readRarities, writeRarities } from "../../core/storage";
import { createStorageSync } from "../../core/storage-sync";
import type { OffersSnapshot } from "../../kyara/offers";
import { offerRarity, RARITIES, type Rarity, rarityPalette } from "../../kyara/rarity";
import type { Feature } from "../types";
import { passesRarity, toRarities } from "./filter";
import { createChips } from "./view";
import "./style.css";

export const rarityFilter: Feature = {
  name: "rarity-filter",
  setup(ctx) {
    let snapshot: OffersSnapshot | null = null;
    let selected: Rarity[] = [];

    const render = () => {
      if (!snapshot) return;
      const palette = rarityPalette();
      for (const offer of snapshot.offers) {
        if (!offer.give) continue;
        offer.li.toggleAttribute("data-kv-hide-rarity", !passesRarity(offerRarity(offer, palette), selected));
      }
    };
    const root = document.documentElement;
    // filtre actif : les offres pas encore traitées (voir runtime.ts) restent cachées, sans clignotement
    const syncRoot = () => root.toggleAttribute("data-kv-filter-rarity", selected.length > 0);
    ctx.page.onInvalidated(() => root.removeAttribute("data-kv-filter-rarity"));
    const apply = (stored: readonly string[]) => {
      selected = toRarities(stored, RARITIES);
      syncRoot();
      chips.setSelected(selected);
      render();
    };
    const sync = createStorageSync(writeRarities, apply);
    const chips = createChips((rarity) => {
      const next = selected.includes(rarity) ? selected.filter((r) => r !== rarity) : [...selected, rarity];
      apply(next); // visuel immédiat, l'écriture suit
      void sync.save(next);
    });

    ctx.filters.addCategory(t("panel.cat.rarity"), chips.root);
    ctx.page.onInvalidated(onRaritiesChange(sync.onStored));
    void safeAsync("rarity-filter:init", async () => apply(await readRarities()))();
    ctx.onOffers((next) => {
      snapshot = next;
      render();
    });
  },
};
