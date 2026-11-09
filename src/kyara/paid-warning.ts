// The site's "this opening spends chakra" confirmation on /ouvrir/<pack>, skipped while the free-only choice
// of features/free-packs is on: the site prices the bulk option it has selected (×4, ×5), not the free-only
// opening the page hook actually sends, so it would ask to confirm a chakra spend that never happens.
// The site skips its warning for the rest of the tab once confirmed (sessionStorage SITE_KEY): we set that
// flag, and remove it again when the choice ends, unless the user had set it themself.
// Side effect: the page's sessionStorage. If the site renames its key, its warning simply shows again.
import { createLogger } from "../core/log";

const log = createLogger("paid-warning");

/** Set by the site once the user confirmed a chakra opening ("1"): no warning for the rest of the tab. */
const SITE_KEY = "kyara.open.paidok";
/** Ours: SITE_KEY was set by the extension, not by the user. */
const OURS_KEY = "kyara-extension.paidok";

/** Runs `fn` on the page's sessionStorage; does nothing if it is not accessible. */
function withSession(fn: (s: Storage) => void): void {
  try {
    fn(sessionStorage);
  } catch (err) {
    log.debug("sessionStorage not accessible, the site's warning is left as is", err);
  }
}

/** Turns off the site's chakra warning, unless the user already did. */
export function skipPaidWarning(): void {
  withSession((s) => {
    if (s.getItem(SITE_KEY) === "1") return;
    s.setItem(SITE_KEY, "1");
    s.setItem(OURS_KEY, "1");
  });
}

/** Turns the site's chakra warning back on if `skipPaidWarning` turned it off (also after a page reload). */
export function restorePaidWarning(): void {
  withSession((s) => {
    if (s.getItem(OURS_KEY) !== "1") return;
    s.removeItem(SITE_KEY);
    s.removeItem(OURS_KEY);
  });
}
