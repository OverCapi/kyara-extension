// Rarity filter: the user picks one or more rarities (common … mythic) in the filter
// panel; only offers whose OFFERED card has that rarity stay visible. No
// rarity chosen = all. The choice is stored (rarities key) and followed across tabs.
// DOM effect: data-kv-hide-rarity attribute on the <li> (CSS hides it).
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
    // filter on: offers not processed yet (see runtime.ts) stay hidden, no flicker
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
      apply(next); // immediate visual, the write follows
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
