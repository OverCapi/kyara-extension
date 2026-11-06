// List of active features. To add a feature: create its folder, then add it here.
import { gainFilter } from "./gain-filter";
import { giveButtons } from "./give-buttons";
import { loadMore } from "./load-more";
import { marketTooltip } from "./market-tooltip";
import { profitTint } from "./profit-tint";
import { rarityFilter } from "./rarity-filter";
import { rarityRing } from "./rarity-ring";
import { tradeBadges } from "./trade-badges";
import type { Feature } from "./types";

// loadMore after the filters: it counts the offers they hid.
export const features: Feature[] = [
  rarityRing,
  tradeBadges,
  giveButtons,
  profitTint,
  gainFilter,
  rarityFilter,
  loadMore,
  marketTooltip,
];
