// Prix minimum actuel d'une carte sur le marché (annonces à prix fixe). Une requête par carte,
// résultat gardé 2 min. Ne lève jamais : `null` = indisponible (échec réseau ou réponse inattendue).
import { createLogger } from "../../core/log";
import { kyaraFetch } from "../../kyara/api";
import { parseMarketMin } from "../../kyara/parse";

const log = createLogger("market-min");

export const TIP_TTL = 2 * 60 * 1000;

export interface MarketMin {
  /** Prix minimum, `null` s'il n'y a aucune annonce. */
  min: number | null;
  count: number;
}

/** Crée une fonction `id -> MarketMin | null` avec son cache. */
export function createMarketMin(): (id: number) => Promise<MarketMin | null> {
  const cache = new Map<number, { value: MarketMin; t: number }>();
  return async (id) => {
    const hit = cache.get(id);
    if (hit && Date.now() - hit.t < TIP_TTL) return hit.value;
    const res = await kyaraFetch(`/market/listings?characterId=${id}&type=fixed&sort=price_asc&pageSize=1`);
    log.debug(`min marché ${id} : HTTP ${res.status}`);
    const value = res.ok ? parseMarketMin(res.data) : null;
    if (value) cache.set(id, { value, t: Date.now() });
    return value;
  };
}
