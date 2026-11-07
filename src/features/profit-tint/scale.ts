// "Full tint at" setting of the offer background: a slider in the filter panel that sets the gain
// (in %) at which the tint reaches full intensity. Stored (tintFull key) and followed live,
// other tabs included. The default (100 %) is the original fixed scale.
import { safeAsync } from "../../core/errors";
import { t } from "../../core/i18n";
import { listen, type PageContext } from "../../core/page";
import { onTintFullChange, readTintFull, writeTintFull } from "../../core/storage";
import { createStorageSync } from "../../core/storage-sync";
import { createSlider } from "../../kyara/filter-panel/slider";

export const MIN_TINT_FULL = 10;
export const MAX_TINT_FULL = 200;

const clamp = (pct: number) => Math.min(MAX_TINT_FULL, Math.max(MIN_TINT_FULL, pct));

/** Creates the slider; `onChange(pct)` is called on every change (made here or from another tab). */
export function createTintScale(page: PageContext, onChange: (pct: number) => void): HTMLElement {
  const slider = createSlider({
    ariaLabel: t("tint.slider_label"),
    min: MIN_TINT_FULL,
    max: MAX_TINT_FULL,
    step: 5,
  });
  slider.root.title = t("tint.title");
  const apply = (value: number) => {
    const pct = clamp(value);
    slider.show(pct, t("tint.full_at", { pct }));
    onChange(pct);
  };
  const sync = createStorageSync(writeTintFull, apply);
  listen(page, slider.range, "input", () => {
    const pct = Number(slider.range.value);
    apply(pct); // immediate visual, the write follows
    void sync.save(pct);
  });
  page.onInvalidated(onTintFullChange(sync.onStored));
  void safeAsync("tint-scale:init", async () => apply(await readTintFull()))();
  return slider.root;
}
