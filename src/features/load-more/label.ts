// Loading text set on the site's "Voir plus d'offres" (load more) button while it loads, whether
// the click comes from the user or from load-more. Only the value of the existing text node changes
// (no node added, the site keeps control of it) and the original text is restored when the offers
// arrive, after a timeout, or when the extension reloads. Text: locales/*.json.
import { safe } from "../../core/errors";
import { t } from "../../core/i18n";
import { listen, type PageContext } from "../../core/page";
import { findLoadMore } from "../../kyara/dom";

/** Call on every render with the number of offers: restores the original text if that number changed. */
export type OffersArrived = (total: number) => void;

/** First non-empty text node of the button: that is the label. */
function labelNode(button: Element): Text | null {
  const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeValue?.trim()) return node as Text;
  }
  return null;
}

/** Listens to clicks on the load more button and shows the loading text on it until `arrived()`. */
export function watchLoadMoreLabel(page: PageContext, timeout: number): OffersArrived {
  let total = 0;
  let current: { node: Text; original: string; total: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const reset = () => {
    clearTimeout(timer);
    // the site may have rewritten the text in the meantime: do not overwrite it
    if (current?.node.nodeValue === t("load.loading")) current.node.nodeValue = current.original;
    current = null;
  };
  listen<MouseEvent>(
    page,
    document,
    "click",
    (event) => {
      const button = findLoadMore();
      if (!button || !(event.target instanceof Node) || !button.contains(event.target)) return;
      const node = current?.node ?? labelNode(button);
      if (!node) return;
      const original = current?.original ?? node.nodeValue ?? "";
      reset();
      current = { node, original, total };
      node.nodeValue = t("load.loading");
      timer = setTimeout(safe("load-more:label", reset), timeout); // loading does not complete
    },
    { capture: true },
  );
  page.onInvalidated(reset);

  return (n) => {
    total = n;
    if (current && n !== current.total) reset();
  };
}
