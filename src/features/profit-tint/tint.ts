// Background color of an offer from its relative gain. Pure function.

/**
 * Relative gain -> CSS color: +100 % or more = full light blue, 0 = neutral, -100 % = full red.
 * `null` (unknown gain) = transparent.
 */
// ponytail: fixed ±100 % threshold, expose as an option if the scale does not fit.
export function tintColor(ratio: number | null): string {
  if (ratio === null) return "transparent";
  const t = Math.max(-1, Math.min(1, ratio));
  const alpha = (0.45 * Math.abs(t)).toFixed(2);
  return t >= 0 ? `rgba(90, 190, 255, ${alpha})` : `rgba(230, 60, 60, ${alpha})`;
}
