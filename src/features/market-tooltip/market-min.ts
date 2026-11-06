// Current minimum market price of a card (fixed-price listings). One request per card,
// result kept 2 min. Never throws: `null` = unavailable (network failure or unexpected response).
import { createLogger } from "../../core/log";
import { kyaraFetch } from "../../kyara/api";
import { parseMarketMin } from "../../kyara/parse";

const log = createLogger("market-min");

export const TIP_TTL = 2 * 60 * 1000;

export interface MarketMin {
  /** Minimum price, `null` if there is no listing. */
  min: number | null;
  count: number;
}

/** Creates an `id -> MarketMin | null` function with its cache. */
export function createMarketMin(): (id: number) => Promise<MarketMin | null> {
  const cache = new Map<number, { value: MarketMin; t: number }>();
  return async (id) => {
    const hit = cache.get(id);
    if (hit && Date.now() - hit.t < TIP_TTL) return hit.value;
    const res = await kyaraFetch(`/market/listings?characterId=${id}&type=fixed&sort=price_asc&pageSize=1`);
    log.debug(`market min ${id}: HTTP ${res.status}`);
    const value = res.ok ? parseMarketMin(res.data) : null;
    if (value) cache.set(id, { value, t: Date.now() });
    return value;
  };
}
