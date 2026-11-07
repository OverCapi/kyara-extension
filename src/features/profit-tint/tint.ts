// Background color of an offer from its relative gain. Pure function.
import { DEFAULT_TINT_FULL } from "../../core/storage";

/**
 * Relative gain -> CSS color: a gain of `fullPct` % or more = full light blue, 0 = neutral,
 * -`fullPct` % or less = full red. `null` (unknown gain) = transparent.
 * `fullPct` <= 0 (not reachable from the slider) makes any gain, however small, full intensity.
 */
export function tintColor(ratio: number | null, fullPct = DEFAULT_TINT_FULL): string {
  if (ratio === null) return "transparent";
  const scaled = fullPct > 0 ? (ratio * 100) / fullPct : Math.sign(ratio);
  const t = Math.max(-1, Math.min(1, scaled));
  const alpha = (0.45 * Math.abs(t)).toFixed(2);
  return t >= 0 ? `rgba(90, 190, 255, ${alpha})` : `rgba(230, 60, 60, ${alpha})`;
}
