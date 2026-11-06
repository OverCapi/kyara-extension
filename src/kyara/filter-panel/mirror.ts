// "Kyara" section of the panel: mirror of the site's filter pills ("Que je n'ai pas", etc.).
// The site keeps its real pills (hidden by CSS): a click on our copy clicks the real one,
// so nothing is moved in the site's tree. The copy follows the original's state (aria-pressed).
// Categories: "Cards" for regular pills, "My offers" for the one that carries a counter.
import { safe } from "../../core/errors";
import { t } from "../../core/i18n";
import { makePill } from "./pill";
import { makeCategory, pillRow } from "./view";

const COUNTER = ".n";

interface Mirrored {
  source: HTMLButtonElement;
  copy: HTMLButtonElement;
}

const labelOf = (pill: Element) => (pill.textContent ?? "").replace(/\s+/g, " ").trim();

export interface PillMirror {
  /** Aligns the copy with the current pills of `filters` (rebuilt only if they changed). */
  sync(filters: HTMLElement): void;
}

/** Fills `host` with copies of the site's pills. */
export function createPillMirror(host: HTMLElement): PillMirror {
  let signature = "";
  let mirrored: Mirrored[] = [];

  const syncPressed = () => {
    for (const { source, copy } of mirrored) {
      copy.setAttribute("aria-pressed", source.getAttribute("aria-pressed") ?? "false");
    }
  };
  const copyOf = (source: HTMLButtonElement): Mirrored => {
    const copy = makePill(labelOf(source));
    copy.addEventListener(
      "click",
      safe("mirror:click", () => {
        source.click();
        setTimeout(safe("mirror:sync", syncPressed), 0); // the site updates its state right after the click
      }),
    );
    return { source, copy };
  };
  const rebuild = (pills: HTMLButtonElement[]) => {
    mirrored = pills.map(copyOf);
    const groups: Array<[string, Mirrored[]]> = [
      [t("panel.cat.cards"), mirrored.filter((m) => !m.source.querySelector(COUNTER))],
      [t("panel.cat.mine"), mirrored.filter((m) => m.source.querySelector(COUNTER))],
    ];
    host.replaceChildren(
      ...groups
        .filter(([, list]) => list.length > 0)
        .map(([title, list]) => makeCategory(title, pillRow(list.map((m) => m.copy)))),
    );
  };

  return {
    sync(filters) {
      const pills = [...filters.querySelectorAll<HTMLButtonElement>(":scope > .pills > button")];
      const next = pills.map(labelOf).join("|");
      // the site's pills can be recreated (re-render) without changing text
      if (next !== signature || mirrored.some((m) => !m.source.isConnected)) {
        signature = next;
        rebuild(pills);
      }
      syncPressed();
    },
  };
}
