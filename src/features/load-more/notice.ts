// "No offer matches the filters" notice under the offer list, drawn by CSS from a data-kv-empty attribute
// on the site's offer board (no node added). Removed when the extension reloads. Text: locales/*.json.
import { t } from "../../core/i18n";
import type { PageContext } from "../../core/page";
import { findOfferBoard } from "../../kyara/page-dom";

const ATTR = "data-kv-empty";

export interface EmptyNotice {
  /** Shows or hides the notice. */
  set(shown: boolean): void;
}

/** Creates the notice (hidden). */
export function createEmptyNotice(page: PageContext): EmptyNotice {
  let board: Element | null = null;
  const clear = () => board?.removeAttribute(ATTR);
  page.onInvalidated(clear);
  return {
    set(shown) {
      clear();
      board = shown ? findOfferBoard() : null;
      board?.setAttribute(ATTR, t("load.none"));
    },
  };
}
