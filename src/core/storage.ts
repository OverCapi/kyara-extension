// Accès typé à browser.storage.local. SEUL endroit qui connaît les clés de stockage :
//   "p:<id>"  médianes marché   (PriceEntry)
//   "f:<id>"  prix fair-play    (FairEntry)
//   "owned"   cartes possédées  (OwnedCards)
//   "noTint"  préférence "couleurs de rentabilité off" (boolean)
// Ces clés sont identiques à celles de l'ancienne version : le cache déjà rempli reste valide.
// Les lectures valident la forme des données : une valeur corrompue est ignorée, jamais propagée.
import { browser } from "wxt/browser";

/** Médianes marché d'une carte. `t` = date d'écriture (ms). */
export interface PriceEntry {
  m7: number | null;
  m30: number | null;
  s7: number | null;
  last: number | null;
  t: number;
}
/** Prix fair-play d'une carte (celui qu'utilise le site pour les échanges). */
export interface FairEntry {
  v: number;
  t: number;
}
/** Cartes possédées : id de carte -> quantité (> 0). */
export type OwnedCards = Record<number, number>;
/** Ce que le parsing produit et que le stockage accepte, déjà indexé par clé. */
export type StorageEntries = Record<string, PriceEntry | FairEntry | OwnedCards>;
/** Prix connus pour un lot de cartes, lus en une seule requête de stockage. */
export interface PriceStore {
  fair: Record<number, FairEntry | undefined>;
  market: Record<number, PriceEntry | undefined>;
}

export const OWNED_KEY = "owned";
const NO_TINT_KEY = "noTint";
export const priceKey = (id: number): string => `p:${id}`;
export const fairKey = (id: number): string => `f:${id}`;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isFair = (v: unknown): v is FairEntry =>
  isObject(v) && typeof v.v === "number" && typeof v.t === "number";
const isPrice = (v: unknown): v is PriceEntry => isObject(v) && typeof v.t === "number";

/** `true` si l'entrée existe et a moins de `ttl` ms. */
export function isFresh(entry: { t: number } | undefined, ttl: number, now = Date.now()): boolean {
  return entry !== undefined && now - entry.t <= ttl;
}

/** Lit les prix (fair-play + marché) de ces cartes en UNE requête de stockage. */
export async function readPrices(ids: number[]): Promise<PriceStore> {
  const raw: Record<string, unknown> = await browser.storage.local.get(
    ids.flatMap((id) => [fairKey(id), priceKey(id)]),
  );
  const store: PriceStore = { fair: {}, market: {} };
  for (const id of ids) {
    const f = raw[fairKey(id)];
    const p = raw[priceKey(id)];
    if (isFair(f)) store.fair[id] = f;
    if (isPrice(p)) store.market[id] = p;
  }
  return store;
}

/** Écrit des entrées déjà indexées par clé (résultat de parseResponse). */
export async function writeEntries(entries: StorageEntries): Promise<void> {
  await browser.storage.local.set(entries);
}

/** Cartes possédées mémorisées, ou `null` si inconnues. */
export async function readOwned(): Promise<OwnedCards | null> {
  const { [OWNED_KEY]: owned } = await browser.storage.local.get(OWNED_KEY);
  return isObject(owned) && !Array.isArray(owned) ? (owned as OwnedCards) : null;
}

/** Préférence "couleurs de rentabilité off". Faux par défaut. */
export async function readNoTint(): Promise<boolean> {
  const { [NO_TINT_KEY]: v } = await browser.storage.local.get(NO_TINT_KEY);
  return v === true;
}

export async function writeNoTint(value: boolean): Promise<void> {
  await browser.storage.local.set({ [NO_TINT_KEY]: value });
}

/** Appelle `cb` à chaque changement du stockage. Renvoie la fonction qui retire l'écouteur. */
export function onStorageChange(cb: () => void): () => void {
  browser.storage.onChanged.addListener(cb);
  return () => browser.storage.onChanged.removeListener(cb);
}

/** Appelle `cb(valeur)` quand la préférence noTint change (autre onglet inclus). */
export function onNoTintChange(cb: (noTint: boolean) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>) => {
    if (NO_TINT_KEY in changes) cb(changes[NO_TINT_KEY]?.newValue === true);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
