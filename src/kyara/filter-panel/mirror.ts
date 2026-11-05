// Section "Kyara" du panneau : reflet des pastilles de filtre du site ("Que je n'ai pas", etc.).
// Le site garde ses vraies pastilles (cachées par le CSS) : un clic sur notre copie clique la vraie,
// donc rien n'est déplacé dans l'arbre du site. La copie suit l'état (aria-pressed) de l'original.
// Catégories : "Cartes" pour les pastilles ordinaires, "Mes offres" pour celle qui porte un compteur.
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
  /** Aligne la copie sur les pastilles actuelles de `filters` (reconstruite seulement si elles ont changé). */
  sync(filters: HTMLElement): void;
}

/** Remplit `host` avec les copies des pastilles du site. */
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
        setTimeout(safe("mirror:sync", syncPressed), 0); // le site met son état à jour juste après le clic
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
      // les pastilles du site peuvent être recréées (re-rendu) sans changer de texte
      if (next !== signature || mirrored.some((m) => !m.source.isConnected)) {
        signature = next;
        rebuild(pills);
      }
      syncPressed();
    },
  };
}
