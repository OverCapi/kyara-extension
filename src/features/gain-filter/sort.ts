// Ordre des offres, de la plus rentable à la moins rentable. Fonction pure.

/**
 * Rang de chaque offre (0 = en premier) d'après son meilleur gain relatif. Gain inconnu (`null`) en
 * dernier. À gain égal, l'ordre du site est gardé. `ratios[i]` = gain de l'offre `i` ; renvoie `rank[i]`.
 */
export function rankByGain(ratios: Array<number | null>): number[] {
  const order = ratios
    .map((ratio, index) => ({ ratio, index }))
    .sort((a, b) => {
      if (a.ratio === b.ratio) return a.index - b.index;
      if (a.ratio === null) return 1;
      if (b.ratio === null) return -1;
      return b.ratio - a.ratio;
    });
  const rank: number[] = [];
  order.forEach(({ index }, position) => {
    rank[index] = position;
  });
  return rank;
}
