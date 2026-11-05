// Réglages du filtre "gain minimum" et du tri, rangés dans le panneau de filtres (2 catégories) :
//   Rentabilité : 3 pastilles de mode (Off / Neutre et + / Positif) + curseur de seuil au pas de 1 % ;
//   Tri         : pastille "Trier par rentabilité".
// Le réglage est mémorisé dans le stockage (clé minGain) et suivi en direct, autres onglets compris.
import { safeAsync } from "../../core/errors";
import { type MessageKey, t } from "../../core/i18n";
import { listen, type PageContext } from "../../core/page";
import {
  GAIN_MODES,
  type GainFilter,
  type GainMode,
  onGainFilterChange,
  readGainFilter,
  writeGainFilter,
} from "../../core/storage";
import { createStorageSync } from "../../core/storage-sync";
import { makePill } from "../../kyara/filter-panel/pill";
import { pillRow } from "../../kyara/filter-panel/view";

export const MAX_GAIN = 100;

const MODE_LABELS: Record<GainMode, MessageKey> = {
  off: "gauge.mode.off",
  neutral: "gauge.mode.neutral",
  positive: "gauge.mode.positive",
};

export interface Gauge {
  /** Contenu de la catégorie "Rentabilité" : modes + curseur. */
  profit: HTMLElement;
  /** Contenu de la catégorie "Tri". */
  sort: HTMLElement;
}

/** Construit les éléments (aucun écouteur). */
function buildGauge() {
  const modes = GAIN_MODES.map((mode) => {
    const button = makePill(t(MODE_LABELS[mode]));
    button.classList.add("kv-mode");
    return { mode, button };
  });
  const text = document.createElement("span");
  const range = document.createElement("input");
  range.type = "range";
  range.min = "0";
  range.max = String(MAX_GAIN);
  range.step = "1";
  range.setAttribute("aria-label", t("gauge.slider_label"));
  const level = document.createElement("div");
  level.className = "kv-level";
  level.append(text, range);
  const profit = document.createElement("div");
  profit.className = "kv-gauge";
  profit.title = t("gauge.title");
  profit.append(pillRow(modes.map((m) => m.button)), level);
  const sortButton = makePill(t("gauge.sort"));
  sortButton.classList.add("kv-sort");
  return { profit, sort: pillRow([sortButton]), sortButton, modes, text, range };
}

/** Crée les réglages. `onChange(filtre)` est appelé à chaque changement (saisi ici ou venu d'un autre onglet). */
export function createGauge(page: PageContext, onChange: (filter: GainFilter) => void): Gauge {
  const { profit, sort, sortButton, modes, text, range } = buildGauge();

  let state: GainFilter = { mode: "off", pct: 0, sort: true };
  const apply = (value: GainFilter) => {
    const pct = Math.min(value.pct, MAX_GAIN);
    state = { ...value, pct };
    for (const m of modes) m.button.setAttribute("aria-pressed", String(m.mode === state.mode));
    sortButton.setAttribute("aria-pressed", String(state.sort));
    range.value = String(pct);
    range.disabled = state.mode === "off";
    profit.style.setProperty("--kv-fill", `${(pct / MAX_GAIN) * 100}%`);
    text.textContent = t("gauge.threshold", { pct });
    onChange(state);
  };
  const sync = createStorageSync(writeGainFilter, apply);
  const update = (patch: Partial<GainFilter>) => {
    const value = { ...state, pct: Number(range.value), ...patch };
    apply(value); // visuel immédiat, l'écriture suit
    void sync.save(value);
  };
  listen(page, range, "input", () => update({}));
  listen(page, sortButton, "click", () => update({ sort: !state.sort }));
  for (const m of modes) listen(page, m.button, "click", () => update({ mode: m.mode }));
  page.onInvalidated(onGainFilterChange(sync.onStored));
  void safeAsync("gauge:init", async () => apply(await readGainFilter()))();

  return { profit, sort };
}
