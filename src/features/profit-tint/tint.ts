// Couleur de fond d'une offre selon son gain relatif. Fonction pure.

/**
 * Gain relatif -> couleur CSS : +100 % ou plus = bleu clair plein, 0 = neutre, -100 % = rouge plein.
 * `null` (gain inconnu) = transparent.
 */
// ponytail: seuil fixe à ±100 %, à exposer en option si l'échelle ne convient pas.
export function tintColor(ratio: number | null): string {
  if (ratio === null) return "transparent";
  const t = Math.max(-1, Math.min(1, ratio));
  const alpha = (0.45 * Math.abs(t)).toFixed(2);
  return t >= 0 ? `rgba(90, 190, 255, ${alpha})` : `rgba(230, 60, 60, ${alpha})`;
}
