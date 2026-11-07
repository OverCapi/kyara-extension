// Settings of the wanted-cards feature: a text input to add a name, removable chips for the
// listed names, and the "only offers with a wanted card" toggle. No matching logic (see index.ts).
import { t } from "../../core/i18n";
import type { WantedCards } from "../../core/storage";
import { makePill } from "../../kyara/filter-panel/pill";
import { addName } from "./match";

export interface WantedView {
  root: HTMLElement;
  /** Shows this list and toggle state. */
  show(wanted: WantedCards): void;
}

/** Creates the settings. `onChange(next)` is called when the user adds/removes a name or flips the toggle. */
export function createView(onChange: (next: WantedCards) => void): WantedView {
  let current: WantedCards = { names: [], only: false };
  const root = document.createElement("div");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "kv-wanted-input";
  input.placeholder = t("wanted.placeholder");
  input.setAttribute("aria-label", t("wanted.placeholder"));
  const chips = document.createElement("div");
  chips.className = "kv-pills";
  const only = makePill(t("wanted.only"));

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const names = addName(current.names, input.value);
    input.value = "";
    if (names.length !== current.names.length) onChange({ ...current, names });
  });
  only.addEventListener("click", () => onChange({ ...current, only: !current.only }));
  root.append(input, chips, only);

  return {
    root,
    show(wanted) {
      current = wanted;
      only.setAttribute("aria-pressed", String(wanted.only));
      chips.replaceChildren(
        ...wanted.names.map((name) => {
          const chip = makePill(`${name} ×`);
          chip.setAttribute("aria-label", t("wanted.remove", { name }));
          chip.addEventListener("click", () =>
            onChange({ ...current, names: current.names.filter((n) => n !== name) }),
          );
          return chip;
        }),
      );
    },
  };
}
