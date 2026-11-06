// Rarity chips of the filter (one per rarity, multi-select) and their short hint. No filtering
// logic here (see index.ts). Each chip carries its rarity's color (--kv-rar CSS variable).
import { t } from "../../core/i18n";
import { makePill } from "../../kyara/filter-panel/pill";
import { RARITIES, type Rarity, rarityCssColor } from "../../kyara/rarity";

export interface Chips {
  root: HTMLElement;
  /** Shows these rarities as chosen. */
  setSelected(selected: readonly Rarity[]): void;
}

/** Creates the chips. `onToggle(rarity)` is called when the user clicks a chip. */
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
