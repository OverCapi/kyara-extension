// Puces de rareté du filtre (une par rareté, multi-sélection) et leur petite aide. Aucune logique de
// filtrage ici (voir index.ts). Chaque puce porte la couleur de sa rareté (variable CSS --kv-rar).
import { t } from "../../core/i18n";
import { makePill } from "../../kyara/filter-panel/pill";
import { RARITIES, type Rarity, rarityCssColor } from "../../kyara/rarity";

export interface Chips {
  root: HTMLElement;
  /** Montre ces raretés comme choisies. */
  setSelected(selected: readonly Rarity[]): void;
}

/** Crée les puces. `onToggle(rareté)` est appelé quand l'utilisateur clique une puce. */
export function createChips(onToggle: (rarity: Rarity) => void): Chips {
  const root = document.createElement("div");
  const row = document.createElement("div");
  row.className = "kv-pills";
  const chips = RARITIES.map((rarity) => {
    const chip = makePill(t(`rarity.${rarity}`));
    chip.classList.add("kv-chip");
    chip.style.setProperty("--kv-rar", rarityCssColor(rarity));
    chip.addEventListener("click", () => onToggle(rarity));
    return { rarity, chip };
  });
  row.append(...chips.map((c) => c.chip));
  const hint = document.createElement("p");
  hint.className = "kv-hint";
  hint.textContent = t("rarity.hint");
  root.append(row, hint);

  return {
    root,
    setSelected(selected) {
      for (const { rarity, chip } of chips)
        chip.setAttribute("aria-pressed", String(selected.includes(rarity)));
    },
  };
}
