// Feature contract. A feature = a folder in features/ that exports a `Feature` object,
// registered in features/index.ts. It knows neither the other features nor the network:
// it receives the offers snapshot and only paints / reacts.
import type { PageContext } from "../core/page";
import type { FilterPanel } from "../kyara/filter-panel";
import type { OffersSnapshot } from "../kyara/offers";

export interface FeatureContext {
  /** Page context: used to remove listeners and elements when the extension is reloaded. */
  page: PageContext;
  /** Filter panel of the Trades tab: `addCategory(title, element)` puts the feature's settings in it. */
  filters: FilterPanel;
  /** Calls `cb` on every page update, with offers, prices and owned cards. */
  onOffers(cb: (snapshot: OffersSnapshot) => void): void;
  /** `true` while fair-play prices of the current offers are being fetched (filters may still change). */
  pricesPending(): boolean;
}

export interface Feature {
  /** Short name, used in logs. */
  name: string;
  /** Called once when the page loads. Sets up the listeners. */
  setup(ctx: FeatureContext): void;
}
