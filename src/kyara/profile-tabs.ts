// Section tabs of the profile page (Vitrine / Collection / Échanges), found by their text: the class names change,
// what the tabs say does not. Used by profile-showcase to turn Collection and Échanges into jumps to its own
// sections, and to come back to the showcase. Read only, plus `isActiveTab`.

/** The three tabs the extension knows. A tab that is not found is `null`. */
export interface ProfileTabs {
  showcase: HTMLButtonElement | null;
  collection: HTMLButtonElement | null;
  trades: HTMLButtonElement | null;
}

const LABELS: ReadonlyArray<readonly [keyof ProfileTabs, RegExp]> = [
  ["showcase", /vitrine|showcase/i],
  ["collection", /collection/i],
  ["trades", /échange|echange|trade/i],
];

/** Finds the tabs in the tab row (`null` row: no tab). */
export function findTabButtons(row: Element | null): ProfileTabs {
  const found: ProfileTabs = { showcase: null, collection: null, trades: null };
  const buttons = row ? [...row.querySelectorAll<HTMLButtonElement>(":scope > button")] : [];
  for (const [key, label] of LABELS) {
    found[key] = buttons.find((b) => label.test(b.textContent ?? "")) ?? null;
  }
  return found;
}

/** `true` if this tab is the one shown. Site markup: class `on`; fallback: `aria-selected`. */
export function isActiveTab(tab: Element): boolean {
  return tab.classList.contains("on") || tab.getAttribute("aria-selected") === "true";
}
