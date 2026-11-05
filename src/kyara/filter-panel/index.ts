// Panneau de filtres : un petit bouton (icône d'entonnoir) dans la barre de filtres de l'onglet Échanges,
// qui ouvre une fenêtre à 2 sections : "Filtres Kyara" (reflet des pastilles du site) puis "Filtres de
// l'extension" (catégories ajoutées par les features via `addCategory`).
// EXCEPTION à la règle "aucun nœud dans le DOM du site", voulue : le bouton doit être avec les filtres.
// Il est réinséré à chaque rendu si le site le retire ; les pastilles d'origine sont cachées (attribut
// data-kv-panel sur la barre) tant que le panneau est là, et tout est retiré quand l'extension est rechargée.
import { listen, type PageContext } from "../../core/page";
import { createPillMirror } from "./mirror";
import { buildMenu, makeCategory } from "./view";
import "./style.css";

const HOST_ATTR = "data-kv-panel";

export interface FilterPanel {
  /** Place le bouton dans la barre de filtres du site, ou le retire si `filters` est `null`. */
  attach(filters: HTMLElement | null): void;
  /** Ajoute une catégorie (titre + contenu) à la section de l'extension. Appelé une fois au démarrage. */
  addCategory(title: string, el: HTMLElement): void;
}

/** Crée le panneau (pas encore dans la page : voir `attach`). */
export function createFilterPanel(page: PageContext): FilterPanel {
  const menu = buildMenu();
  const mirror = createPillMirror(menu.kyara);
  let host: HTMLElement | null = null;

  let isOpen = false;
  const setOpen = (open: boolean) => {
    isOpen = open;
    menu.popover.hidden = !open;
    menu.button.setAttribute("aria-expanded", String(open));
  };
  listen(page, menu.button, "click", () => setOpen(!isOpen));
  listen(page, document, "click", (e) => {
    if (!(e.target instanceof Node) || !menu.root.contains(e.target)) setOpen(false);
  });
  listen<KeyboardEvent>(page, document, "keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  page.onInvalidated(() => {
    menu.root.remove();
    host?.removeAttribute(HOST_ATTR); // les vraies pastilles du site reviennent
  });

  return {
    attach(filters) {
      host = filters;
      if (!filters) return menu.root.remove();
      filters.setAttribute(HOST_ATTR, "");
      if (menu.root.parentElement !== filters) filters.append(menu.root);
      mirror.sync(filters);
    },
    addCategory(title, el) {
      menu.extension.append(makeCategory(title, el));
    },
  };
}
