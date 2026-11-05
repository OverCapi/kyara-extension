// Règle du filtre "gain minimum". Fonction pure.
import type { GainFilter } from "../../core/storage";

/**
 * `true` si l'offre doit rester visible. `ratio` = meilleur gain relatif (0.25 = +25 %).
 *   off      : tout reste visible ;
 *   neutral  : gain ≥ 0 et ≥ seuil ;
 *   positive : gain > 0 et ≥ seuil.
 * Gain inconnu (`null`) : masqué dès que le filtre est actif.
 */
export function passesGainFilter(
  ratio: number | null,
  { mode, pct }: Pick<GainFilter, "mode" | "pct">,
): boolean {
  if (mode === "off") return true;
  if (ratio === null) return false;
  if (mode === "positive" && ratio <= 0) return false;
  // comparer en ratio, pas en % : 0.29 * 100 vaut 28.999… et raterait le seuil 29 %
  return ratio >= pct / 100;
}
