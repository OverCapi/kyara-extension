// Owned cards. The passive cache stores them when the site loads the collection;
// if that load was missed (extension loaded later), ONE catch-up request per page.
import { createLogger } from "../core/log";
import { OWNED_KEY, type OwnedCards, readOwned, writeEntries } from "../core/storage";
import { kyaraFetch } from "./api";
import { parseCollection } from "./parse";

const log = createLogger("collection");

export interface CollectionLoader {
  /** Owned cards, or `null` if unknown (logged out, failed request). */
  load(): Promise<OwnedCards | null>;
}

export function createCollectionLoader(): CollectionLoader {
  let asked = false;
  return {
    async load() {
      const stored = await readOwned();
      if (stored || asked) return stored;
      asked = true;
      const res = await kyaraFetch("/me/collection?lean=1");
      log.debug(`collection: HTTP ${res.status}`);
      const owned = res.ok ? parseCollection(res.data) : null;
      if (owned) await writeEntries({ [OWNED_KEY]: owned });
      return owned;
    },
  };
}
