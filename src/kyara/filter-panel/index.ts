// Filter panel: a small button (funnel icon) in the filter bar of the Trades tab,
// that opens a popover with 2 sections: "Kyara filters" (mirror of the site's pills) then "Extension
// filters" (categories added by the features through `addCategory`).
// Deliberate EXCEPTION to the "no node in the site's DOM" rule: the button must sit with the filters.
// It is reinserted on every render if the site removes it; the original pills are hidden (data-kv-panel
// attribute on the bar) while the panel is there, and everything is removed when the extension reloads.
import { listen, type PageContext } from "../../core/page";
import { createPillMirror } from "./mirror";
import { buildMenu, makeCategory } from "./view";
import "./style.css";

const HOST_ATTR = "data-kv-panel";

export interface FilterPanel {
  /** Places the button in the site's filter bar, or removes it if `filters` is `null`. */
  attach(filters: HTMLElement | null): void;
  /** Adds a category (title + content) to the extension section. Called once at startup. */
  addCategory(title: string, el: HTMLElement): void;
}

/** Creates the panel (not in the page yet: see `attach`). */
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
    host?.removeAttribute(HOST_ATTR); // the site's real pills come back
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
