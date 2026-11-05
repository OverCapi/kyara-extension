// Contrat d'une feature. Une feature = un dossier dans features/ qui exporte un objet `Feature`,
// enregistré dans features/index.ts. Elle ne connaît ni les autres features ni le réseau :
// elle reçoit l'instantané des offres et se contente de peindre / réagir.
import type { PageContext } from "../core/page";
import type { FilterPanel } from "../kyara/filter-panel";
import type { OffersSnapshot } from "../kyara/offers";

export interface FeatureContext {
  /** Contexte de la page : sert à retirer écouteurs et éléments quand l'extension est rechargée. */
  page: PageContext;
  /** Panneau de filtres de l'onglet Échanges : `addCategory(titre, élément)` y range les réglages de la feature. */
  filters: FilterPanel;
  /** Appelle `cb` à chaque mise à jour de la page, avec offres, prix et cartes possédées. */
  onOffers(cb: (snapshot: OffersSnapshot) => void): void;
}

export interface Feature {
  /** Nom court, utilisé dans les logs. */
  name: string;
  /** Appelée une fois au chargement de la page. Branche les écouteurs. */
  setup(ctx: FeatureContext): void;
}
