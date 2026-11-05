// Liste des features actives. Pour ajouter une feature : créer son dossier, puis l'ajouter ici.
import { marketTooltip } from "./market-tooltip";
import { profitTint } from "./profit-tint";
import { rarityRing } from "./rarity-ring";
import { tradeBadges } from "./trade-badges";
import type { Feature } from "./types";

export const features: Feature[] = [rarityRing, tradeBadges, profitTint, marketTooltip];
