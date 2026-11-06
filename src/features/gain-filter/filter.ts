// Rule of the "minimum gain" filter. Pure function.
import type { GainFilter } from "../../core/storage";

/**
 * `true` if the offer must stay visible. `ratio` = best relative gain (0.25 = +25 %).
 *   off      : everything stays visible;
 *   neutral  : gain ≥ 0 and ≥ threshold;
 *   positive : gain > 0 and ≥ threshold.
 * Unknown gain (`null`): hidden as soon as the filter is on.
 */
export function passesGainFilter(
  ratio: number | null,
  { mode, pct }: Pick<GainFilter, "mode" | "pct">,
): boolean {
  if (mode === "off") return true;
  if (ratio === null) return false;
  if (mode === "positive" && ratio <= 0) return false;
  // compare as a ratio, not in %: 0.29 * 100 is 28.999… and would miss the 29 % threshold
  return ratio >= pct / 100;
}
