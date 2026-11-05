// Barrières anti-crash : une erreur dans une feature ou un callback est attrapée et loguée (dev),
// jamais propagée au site ni aux autres features.
// Toute fonction branchée sur un événement (listener, timer, observer) doit passer par ici.
import { createLogger } from "./log";

const log = createLogger("errors");

/** Enveloppe `fn` : l'exception éventuelle est loguée au lieu d'être levée. `label` nomme l'origine. */
export function safe<A extends unknown[]>(label: string, fn: (...args: A) => void): (...args: A) => void {
  return (...args) => {
    try {
      fn(...args);
    } catch (err) {
      log.error(label, err);
    }
  };
}

/** Comme `safe`, pour une fonction async. La promesse renvoyée ne rejette jamais. */
export function safeAsync<A extends unknown[]>(
  label: string,
  fn: (...args: A) => Promise<void> | void,
): (...args: A) => Promise<void> {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      log.error(label, err);
    }
  };
}
