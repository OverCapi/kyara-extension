// Texte « Chargement… » posé sur le bouton « Voir plus d'offres » du site pendant qu'il charge, que
// le clic vienne de l'utilisateur ou de load-more. On change seulement la valeur du nœud texte existant
// (aucun nœud ajouté, le site garde la main dessus) et on remet le texte d'origine à l'arrivée des
// offres, après un délai, ou quand l'extension est rechargée. Texte : locales/*.json.
import { safe } from "../../core/errors";
import { t } from "../../core/i18n";
import { listen, type PageContext } from "../../core/page";
import { findLoadMore } from "../../kyara/dom";

/** À appeler à chaque rendu avec le nombre d'offres : remet le texte d'origine si ce nombre a changé. */
export type OffersArrived = (total: number) => void;

/** Premier nœud texte non vide du bouton : c'est le libellé. */
function labelNode(button: Element): Text | null {
  const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeValue?.trim()) return node as Text;
  }
  return null;
}

/** Écoute les clics sur « Voir plus d'offres » et y affiche « Chargement… » jusqu'à `arrived()`. */
export function watchLoadMoreLabel(page: PageContext, timeout: number): OffersArrived {
  let total = 0;
  let current: { node: Text; original: string; total: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const reset = () => {
    clearTimeout(timer);
    // le site a pu réécrire le texte entre-temps : on ne l'écrase pas
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
      timer = setTimeout(safe("load-more:label", reset), timeout); // le chargement n'aboutit pas
    },
    { capture: true },
  );
  page.onInvalidated(reset);

  return (n) => {
    total = n;
    if (current && n !== current.total) reset();
  };
}
