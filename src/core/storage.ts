// Accès typé à browser.storage.local. SEUL endroit qui connaît les clés de stockage :
//   "p:<id>"  médianes marché   (PriceEntry)
//   "f:<id>"  prix fair-play    (FairEntry)
//   "owned"   cartes possédées  (OwnedCards)
//   "noTint"  préférence "couleurs de rentabilité off" (boolean)
//   "minGain" filtre "gain minimum" (GainFilter ; ancien format : nombre de %, > 0 = actif)
//   "rarities" raretés affichées (liste de textes ; vide = toutes)
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
const MIN_GAIN_KEY = "minGain";
const RARITIES_KEY = "rarities";
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

/** Appelle `cb(newValue)` quand cette clé change (autre onglet inclus). */
function onKeyChange(key: string, cb: (value: unknown) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>) => {
    if (key in changes) cb(changes[key]?.newValue);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

/** Appelle `cb(valeur)` quand la préférence noTint change (autre onglet inclus). */
export function onNoTintChange(cb: (noTint: boolean) => void): () => void {
  return onKeyChange(NO_TINT_KEY, (v) => cb(v === true));
}

/** Mode du filtre "gain minimum" : coupé, neutres et rentables, ou rentables seulement. */
export type GainMode = "off" | "neutral" | "positive";
export const GAIN_MODES: readonly GainMode[] = ["off", "neutral", "positive"];

/**
 * Réglage de l'onglet Échanges : filtre "gain minimum" (`mode` + `pct` = seuil en %, 0 = pas de seuil
 * en plus du mode) et `sort` = offres triées de la plus rentable à la moins rentable.
 */
export interface GainFilter {
  mode: GainMode;
  pct: number;
  sort: boolean;
}

const isPct = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isMode = (v: unknown): v is GainMode => GAIN_MODES.includes(v as GainMode);

function toGainFilter(v: unknown): GainFilter {
  // anciens formats : un nombre (> 0 = actif), puis { on, pct }, puis { mode, pct } (sans tri)
  if (isPct(v)) return { mode: v > 0 ? "neutral" : "off", pct: v, sort: true };
  if (!isObject(v) || !isPct(v.pct)) return { mode: "off", pct: 0, sort: true };
  const sort = v.sort !== false; // tri actif par défaut
  if (isMode(v.mode)) return { mode: v.mode, pct: v.pct, sort };
  return { mode: v.on === true ? "neutral" : "off", pct: v.pct, sort };
}

/** Filtre "gain minimum" mémorisé. Coupé à 0 % par défaut ou si la valeur est corrompue. */
export async function readGainFilter(): Promise<GainFilter> {
  const { [MIN_GAIN_KEY]: v } = await browser.storage.local.get(MIN_GAIN_KEY);
  return toGainFilter(v);
}

export async function writeGainFilter(value: GainFilter): Promise<void> {
  await browser.storage.local.set({ [MIN_GAIN_KEY]: value });
}

/** Appelle `cb(filtre)` quand le filtre "gain minimum" change (autre onglet inclus). */
export function onGainFilterChange(cb: (filter: GainFilter) => void): () => void {
  return onKeyChange(MIN_GAIN_KEY, (v) => cb(toGainFilter(v)));
}

const toStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Raretés choisies pour le filtre (liste vide = toutes). Les valeurs invalides sont ignorées. */
export async function readRarities(): Promise<string[]> {
  const { [RARITIES_KEY]: v } = await browser.storage.local.get(RARITIES_KEY);
  return toStrings(v);
}

export async function writeRarities(value: string[]): Promise<void> {
  await browser.storage.local.set({ [RARITIES_KEY]: value });
}

/** Appelle `cb(raretés)` quand le filtre de rareté change (autre onglet inclus). */
export function onRaritiesChange(cb: (rarities: string[]) => void): () => void {
  return onKeyChange(RARITIES_KEY, (v) => cb(toStrings(v)));
}
