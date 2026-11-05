// Écriture d'un réglage + tri de ce qui revient par storage.onChanged. Nos propres écritures reviennent
// aussi, parfois après une saisie plus récente : sans ce tri, un écho en retard annulerait la saisie
// (ex. curseur qui saute en arrière pendant qu'on le fait glisser). Seuls les changements venus d'ailleurs
// (un autre onglet) sont appliqués. Effet de bord : une écriture dans le stockage à chaque `save`.
import { safeAsync } from "./errors";

export interface StorageSync<T> {
  /** Mémorise le réglage. Ne rejette jamais. */
  save(value: T): Promise<void>;
  /** À brancher sur le suivi du stockage : n'appelle `apply` que pour les changements venus d'ailleurs. */
  onStored(value: T): void;
}

/** `write` mémorise une valeur ; `apply` la montre (appelée pour les valeurs venues d'un autre onglet). */
export function createStorageSync<T>(
  write: (value: T) => Promise<void>,
  apply: (value: T) => void,
): StorageSync<T> {
  const echoes: string[] = []; // nos écritures dont l'écho n'est pas encore revenu, dans l'ordre
  return {
    save: safeAsync("storage-sync:save", async (value: T) => {
      const key = JSON.stringify(value);
      echoes.push(key);
      try {
        await write(value);
      } catch (err) {
        echoes.splice(echoes.indexOf(key), 1); // écriture ratée : aucun écho à attendre
        throw err; // logué par safeAsync
      }
    }),
    onStored(value) {
      const i = echoes.indexOf(JSON.stringify(value));
      if (i !== -1) {
        echoes.splice(0, i + 1); // notre propre écriture (et les échos plus anciens)
        return;
      }
      apply(value); // vient d'un autre onglet
    },
  };
}
