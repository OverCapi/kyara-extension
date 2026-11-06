// Reads the kyara.games API's JSON responses. The ONLY place that knows these formats.
// Used by the background (passive cache) AND by the content script (on-demand requests).
// No function throws: invalid or unexpected data -> empty result / null.
import { type FairEntry, fairKey, type PriceEntry, priceKey, type StorageEntries } from "../core/storage";

const MAX_DEPTH = 50; // ponytail: guard against absurdly nested JSON; useless for the real API.

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

/** An object `{ characterId, median7d, ... }` -> key + storage entry, or `null` if it is not a price. */
function toPriceEntry(obj: Record<string, unknown>, now: number): [string, PriceEntry] | null {
  if (typeof obj.characterId !== "number" || !("median7d" in obj)) return null;
  const entry: PriceEntry = {
    m7: num(obj.median7d),
    m30: num(obj.median30d),
    s7: num(obj.sales7d),
    last: num(obj.lastPrice),
    t: now,
  };
  return [priceKey(obj.characterId), entry];
}

/** Finds, at any depth, the objects `{ characterId, median7d, ... }` (market medians). */
export function parsePrices(json: unknown, now = Date.now(), depth = 0): StorageEntries {
  const out: StorageEntries = {};
  if (depth > MAX_DEPTH || typeof json !== "object" || json === null) return out;
  const found = isRecord(json) ? toPriceEntry(json, now) : null;
  if (found) out[found[0]] = found[1];
  for (const child of Object.values(json)) Object.assign(out, parsePrices(child, now, depth + 1));
  return out;
}

/** Fair-play response `{ "<id>": price }`. Keeps numbers (0 included), ignores the rest. */
export function parseFair(json: unknown, now = Date.now()): StorageEntries {
  const out: StorageEntries = {};
  if (!isRecord(json)) return out;
  for (const [id, v] of Object.entries(json)) {
    const cardId = Number(id);
    if (typeof v !== "number" || !Number.isInteger(cardId)) continue;
    const entry: FairEntry = { v, t: now };
    out[fairKey(cardId)] = entry;
  }
  return out;
}

/** Listings of a card: minimum price and number of listings. `null` if the response is unexpected. */
export function parseMarketMin(json: unknown): { min: number | null; count: number } | null {
  if (!isRecord(json)) return null;
  const first = Array.isArray(json.items) ? json.items[0] : undefined;
  return { min: isRecord(first) ? num(first.price) : null, count: num(json.total) ?? 0 };
}

/** Picks the right format from the called URL. Returns entries ready to write to storage (empty if none). */
export function parseResponse(url: string, json: unknown, now = Date.now()): StorageEntries {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return {}; // invalid URL: nothing to store
  }
  if (path === "/api/fair-play/prices") return parseFair(json, now);
  return parsePrices(json, now);
}
