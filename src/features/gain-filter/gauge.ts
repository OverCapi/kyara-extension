// Settings of the "minimum gain" filter and of sorting, placed in the filter panel (2 categories):
//   Profitability: 3 mode pills (Off / Neutral and up / Positive) + threshold slider in 1 % steps;
//   Sort         : "Sort by profitability" pill.
// The setting is stored (minGain key) and followed live, other tabs included.
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
import { createSlider } from "../../kyara/filter-panel/slider";
import { pillRow } from "../../kyara/filter-panel/view";

export const MAX_GAIN = 100;

const MODE_LABELS: Record<GainMode, MessageKey> = {
  off: "gauge.mode.off",
  neutral: "gauge.mode.neutral",
  positive: "gauge.mode.positive",
};

export interface Gauge {
  /** Content of the "Profitability" category: modes + slider. */
  profit: HTMLElement;
  /** Content of the "Sort" category. */
  sort: HTMLElement;
}

/** Builds the elements (no listener). */
function buildGauge() {
  const modes = GAIN_MODES.map((mode) => {
    const button = makePill(t(MODE_LABELS[mode]));
    button.classList.add("kv-mode");
    return { mode, button };
  });
  const slider = createSlider({ ariaLabel: t("gauge.slider_label"), min: 0, max: MAX_GAIN, step: 1 });
  const profit = document.createElement("div");
  profit.className = "kv-gauge";
  profit.title = t("gauge.title");
  profit.append(pillRow(modes.map((m) => m.button)), slider.root);
  const sortButton = makePill(t("gauge.sort"));
  sortButton.classList.add("kv-sort");
  return { profit, sort: pillRow([sortButton]), sortButton, modes, slider };
}

/** Creates the settings. `onChange(filter)` is called on every change (made here or from another tab). */
export function createGauge(page: PageContext, onChange: (filter: GainFilter) => void): Gauge {
  const { profit, sort, sortButton, modes, slider } = buildGauge();

  let state: GainFilter = { mode: "off", pct: 0, sort: true };
  const apply = (value: GainFilter) => {
    const pct = Math.min(value.pct, MAX_GAIN);
    state = { ...value, pct };
    for (const m of modes) m.button.setAttribute("aria-pressed", String(m.mode === state.mode));
    sortButton.setAttribute("aria-pressed", String(state.sort));
    slider.range.disabled = state.mode === "off";
    slider.show(pct, t("gauge.threshold", { pct }));
    onChange(state);
  };
  const sync = createStorageSync(writeGainFilter, apply);
  const update = (patch: Partial<GainFilter>) => {
    const value = { ...state, pct: Number(slider.range.value), ...patch };
    apply(value); // immediate visual, the write follows
    void sync.save(value);
  };
  listen(page, slider.range, "input", () => update({}));
  listen(page, sortButton, "click", () => update({ sort: !state.sort }));
  for (const m of modes) listen(page, m.button, "click", () => update({ mode: m.mode }));
  page.onInvalidated(onGainFilterChange(sync.onStored));
  void safeAsync("gauge:init", async () => apply(await readGainFilter()))();

  return { profit, sort };
}
