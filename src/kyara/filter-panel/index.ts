// Filter panel: a small button (funnel icon) in the filter bar of the Trades tab,
// that opens a popover with 2 sections: "Kyara filters" (mirror of the site's pills) then "Extension
// filters" (categories added by the features through `addCategory`).
// Deliberate EXCEPTION to the "no node in the site's DOM" rule: the button must sit with the filters.
// It is reinserted on every render if the site removes it; the original pills are hidden (data-kv-panel
// attribute on the bar) while the panel is there, and everything is removed when the extension reloads.
import { listen, onShortcut, type PageContext } from "../../core/page";
import type { OfferFilters } from "../page-dom";
import { createPillMirror } from "./mirror";
import { buildMenu, makeCategory } from "./view";
import "./style.css";

/** On the site's pills row while the panel mirrors it: hidden by CSS. */
const HOST_ATTR = "data-kv-panel";

export interface FilterPanel {
  /** Places the button in the site's filter bar, or removes it if `filters` is `null`. */
  attach(filters: OfferFilters | null): void;
  /** Adds a category (title + content) to the extension section. Called once at startup. */
  addCategory(title: string, el: HTMLElement): void;
}

/** "end" (popover opens leftward) when the button sits in the right half of the window, else "start". */
function alignOf(button: HTMLElement): "start" | "end" {
  const box = button.getBoundingClientRect();
  return box.left + box.width / 2 > window.innerWidth / 2 ? "end" : "start";
}

/** Creates the panel (not in the page yet: see `attach`). */
export function createFilterPanel(page: PageContext): FilterPanel {
  const menu = buildMenu();
  const mirror = createPillMirror(menu.kyara);
  let host: HTMLElement | null = null;

  let isOpen = false;
  const setOpen = (open: boolean) => {
    isOpen = open;
    // the site moves its filter bar around: open toward the side with room, measured at each opening
    if (open) menu.root.dataset.kvAlign = alignOf(menu.button);
    menu.popover.hidden = !open;
    menu.button.setAttribute("aria-expanded", String(open));
  };
  listen(page, menu.button, "click", () => setOpen(!isOpen));
  // pointerdown, not click: the site's buttons clicked by script (load-more, mirrored pills) fire a
  // click but no pointerdown, and must not close the panel while the user is setting it.
  listen(page, document, "pointerdown", (e) => {
    if (!(e.target instanceof Node) || !menu.root.contains(e.target)) setOpen(false);
  });
  listen<KeyboardEvent>(page, document, "keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  onShortcut(page, "f", () => setOpen(!isOpen));
  page.onInvalidated(() => {
    menu.root.remove();
    host?.removeAttribute(HOST_ATTR); // the site's real pills come back
  });

  return {
    attach(filters) {
      if (host !== filters?.pills) host?.removeAttribute(HOST_ATTR); // the site rebuilt its bar
      host = filters?.pills ?? null;
      if (!filters) return menu.root.remove();
      filters.pills.setAttribute(HOST_ATTR, "");
      if (menu.root.parentElement !== filters.bar) filters.bar.append(menu.root);
      mirror.sync(filters.pills);
    },
    addCategory(title, el) {
      menu.extension.append(makeCategory(title, el));
    },
  };
}
