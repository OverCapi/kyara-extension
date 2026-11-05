// Cartes possédées. Le cache passif les range dans le stockage quand le site charge la collection ;
// si on a raté ce chargement (extension chargée après), UNE seule requête de rattrapage par page.
import { createLogger } from "../core/log";
import { OWNED_KEY, type OwnedCards, readOwned, writeEntries } from "../core/storage";
import { kyaraFetch } from "./api";
import { parseCollection } from "./parse";

const log = createLogger("collection");

export interface CollectionLoader {
  /** Cartes possédées, ou `null` si inconnues (non connecté, requête échouée). */
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
      log.debug(`collection : HTTP ${res.status}`);
      const owned = res.ok ? parseCollection(res.data) : null;
      if (owned) await writeEntries({ [OWNED_KEY]: owned });
      return owned;
    },
  };
}
