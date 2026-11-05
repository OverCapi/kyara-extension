// Lecture des réponses JSON de l'API kyara.games. SEUL endroit qui connaît ces formats.
// Utilisé par le background (cache passif) ET par le content script (requêtes à la demande).
// Aucune fonction ne lève d'exception : donnée invalide ou inattendue -> résultat vide / null.
import {
  type FairEntry,
  fairKey,
  OWNED_KEY,
  type OwnedCards,
  type PriceEntry,
  priceKey,
  type StorageEntries,
} from "../core/storage";

const MAX_DEPTH = 50; // ponytail: garde-fou contre un JSON absurdement imbriqué ; inutile pour l'API réelle.

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

/** Un objet `{ characterId, median7d, ... }` -> clé + entrée de stockage, ou `null` si ce n'est pas un prix. */
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

/** Cherche, à n'importe quelle profondeur, les objets `{ characterId, median7d, ... }` (médianes marché). */
export function parsePrices(json: unknown, now = Date.now(), depth = 0): StorageEntries {
  const out: StorageEntries = {};
  if (depth > MAX_DEPTH || typeof json !== "object" || json === null) return out;
  const found = isRecord(json) ? toPriceEntry(json, now) : null;
  if (found) out[found[0]] = found[1];
  for (const child of Object.values(json)) Object.assign(out, parsePrices(child, now, depth + 1));
  return out;
}

/** Réponse fair-play `{ "<id>": prix }`. Garde les nombres (0 inclus), ignore le reste. */
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

/** Collection `[{ characterId, qty }]` -> cartes possédées (qty > 0). `null` si ce n'est pas une collection. */
export function parseCollection(json: unknown): OwnedCards | null {
  if (!Array.isArray(json)) return null;
  const owned: OwnedCards = {};
  for (const c of json) {
    if (isRecord(c) && typeof c.characterId === "number" && typeof c.qty === "number" && c.qty > 0) {
      owned[c.characterId] = c.qty;
    }
  }
  return owned;
}

/** Annonces d'une carte : prix minimum et nombre d'annonces. `null` si la réponse est inattendue. */
export function parseMarketMin(json: unknown): { min: number | null; count: number } | null {
  if (!isRecord(json)) return null;
  const first = Array.isArray(json.items) ? json.items[0] : undefined;
  return { min: isRecord(first) ? num(first.price) : null, count: num(json.total) ?? 0 };
}

/** Choisit le bon format selon l'URL appelée. Renvoie les entrées prêtes à écrire dans le stockage (vide si rien). */
export function parseResponse(url: string, json: unknown, now = Date.now()): StorageEntries {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return {}; // URL invalide : rien à stocker
  }
  if (path === "/api/me/collection") {
    const owned = parseCollection(json);
    return owned ? { [OWNED_KEY]: owned } : {};
  }
  if (path === "/api/fair-play/prices") return parseFair(json, now);
  return parsePrices(json, now);
}
