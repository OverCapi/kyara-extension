// Liste des features actives. Pour ajouter une feature : créer son dossier, puis l'ajouter ici.
import { gainFilter } from "./gain-filter";
import { loadMore } from "./load-more";
import { marketTooltip } from "./market-tooltip";
import { profitTint } from "./profit-tint";
import { rarityFilter } from "./rarity-filter";
import { rarityRing } from "./rarity-ring";
import { tradeBadges } from "./trade-badges";
import type { Feature } from "./types";

// loadMore après les filtres : il compte les offres qu'ils ont masquées.
export const features: Feature[] = [
  rarityRing,
  tradeBadges,
  profitTint,
  gainFilter,
  rarityFilter,
  loadMore,
  marketTooltip,
];
