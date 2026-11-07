// Labelled range slider for the filter panel (text on the left, track filled up to the value).
// Used by the features' settings (gain threshold, tint scale). No listener, no storage: the
// caller listens to `range` "input" and calls `show()`. DOM: builds a detached element.

export interface Slider {
  root: HTMLElement;
  range: HTMLInputElement;
  /** Displays `value` on the handle and fill, with `label` as the text. */
  show(value: number, label: string): void;
}

/** Creates a slider from `min` to `max`; `ariaLabel` is an already translated text. */
export function createSlider(opts: { ariaLabel: string; min: number; max: number; step: number }): Slider {
  const text = document.createElement("span");
  const range = document.createElement("input");
  range.type = "range";
  range.min = String(opts.min);
  range.max = String(opts.max);
  range.step = String(opts.step);
  range.setAttribute("aria-label", opts.ariaLabel);
  const root = document.createElement("div");
  root.className = "kv-level";
  root.append(text, range);
  return {
    root,
    range,
    show(value, label) {
      range.value = String(value);
      root.style.setProperty("--kv-fill", `${((value - opts.min) / (opts.max - opts.min)) * 100}%`);
      text.textContent = label;
    },
  };
}
