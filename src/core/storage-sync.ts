// Writes a setting + sorts what comes back through storage.onChanged. Our own writes come back
// too, sometimes after a more recent input: without this sorting, a late echo would undo the input
// (e.g. a slider jumping back while being dragged). Only changes from elsewhere
// (another tab) are applied. Side effect: one storage write per `save`.
import { safeAsync } from "./errors";

export interface StorageSync<T> {
  /** Stores the setting. Never rejects. */
  save(value: T): Promise<void>;
  /** Plug into storage change tracking: only calls `apply` for changes that came from elsewhere. */
  onStored(value: T): void;
}

/** `write` stores a value; `apply` shows it (called for values coming from another tab). */
export function createStorageSync<T>(
  write: (value: T) => Promise<void>,
  apply: (value: T) => void,
): StorageSync<T> {
  const echoes: string[] = []; // our writes whose echo has not come back yet, in order
  return {
    save: safeAsync("storage-sync:save", async (value: T) => {
      const key = JSON.stringify(value);
      echoes.push(key);
      try {
        await write(value);
      } catch (err) {
        echoes.splice(echoes.indexOf(key), 1); // failed write: no echo to wait for
        throw err; // logged by safeAsync
      }
    }),
    onStored(value) {
      const i = echoes.indexOf(JSON.stringify(value));
      if (i !== -1) {
        echoes.splice(0, i + 1); // our own write (and older echoes)
        return;
      }
      apply(value); // comes from another tab
    },
  };
}
