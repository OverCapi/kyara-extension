// Crash barriers: an error in a feature or a callback is caught and logged (dev),
// never propagated to the site or to the other features.
// Every function plugged into an event (listener, timer, observer) must go through here.
import { createLogger } from "./log";

const log = createLogger("errors");

/** Wraps `fn`: any exception is logged instead of thrown. `label` names the origin. */
export function safe<A extends unknown[]>(label: string, fn: (...args: A) => void): (...args: A) => void {
  return (...args) => {
    try {
      fn(...args);
    } catch (err) {
      log.error(label, err);
    }
  };
}

/** Like `safe`, for an async function. The returned promise never rejects. */
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
