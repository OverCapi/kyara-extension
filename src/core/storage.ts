// Typed access to browser.storage.local. The ONLY place that knows the storage keys:
//   "p:<id>"  market medians    (PriceEntry)
//   "f:<id>"  fair-play price   (FairEntry)
//   "noTint"  "profit colors off" preference (boolean)
//   "minGain" "minimum gain" filter (GainFilter; old format: number of %, > 0 = on)
//   "tintFull" gain (%) at which the offer tint is at full intensity (number)
//   "rarities" shown rarities (list of strings; empty = all)
//   "wanted"  wanted cards list (WantedCards)
//   "profileDesign" chosen design of the profile page (see storage-design.ts)
// Same keys as the old version (the cache stays valid). Reads validate the shape: corrupted values are ignored.
import { browser } from "wxt/browser";

/** Market medians of a card. `t` = write time (ms). */
export interface PriceEntry {
  m7: number | null;
  m30: number | null;
  s7: number | null;
  last: number | null;
  t: number;
}
/** Fair-play price of a card (the one the site uses for trades). */
export interface FairEntry {
  v: number;
  t: number;
}
/** What parsing produces and storage accepts, already indexed by key. */
export type StorageEntries = Record<string, PriceEntry | FairEntry>;
/** Known prices for a batch of cards, read in a single storage request. */
export interface PriceStore {
  fair: Record<number, FairEntry | undefined>;
  market: Record<number, PriceEntry | undefined>;
}

const NO_TINT_KEY = "noTint";
const MIN_GAIN_KEY = "minGain";
const RARITIES_KEY = "rarities";
const TINT_FULL_KEY = "tintFull";
const WANTED_KEY = "wanted";
export const priceKey = (id: number): string => `p:${id}`;
export const fairKey = (id: number): string => `f:${id}`;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isFair = (v: unknown): v is FairEntry =>
  isObject(v) && typeof v.v === "number" && typeof v.t === "number";
const isPrice = (v: unknown): v is PriceEntry => isObject(v) && typeof v.t === "number";

/** `true` if the entry exists and is less than `ttl` ms old. */
export function isFresh(entry: { t: number } | undefined, ttl: number, now = Date.now()): boolean {
  return entry !== undefined && now - entry.t <= ttl;
}

/** Reads the prices (fair-play + market) of these cards in ONE storage request. */
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

/** Writes entries already indexed by key (result of parseResponse). */
export async function writeEntries(entries: StorageEntries): Promise<void> {
  await browser.storage.local.set(entries);
}

/** "Profit colors off" preference. False by default. */
export async function readNoTint(): Promise<boolean> {
  const { [NO_TINT_KEY]: v } = await browser.storage.local.get(NO_TINT_KEY);
  return v === true;
}

export const writeNoTint = (value: boolean): Promise<void> =>
  browser.storage.local.set({ [NO_TINT_KEY]: value });

/** Calls `cb` on every storage change. Returns the function that removes the listener. */
export function onStorageChange(cb: () => void): () => void {
  browser.storage.onChanged.addListener(cb);
  return () => browser.storage.onChanged.removeListener(cb);
}

/** Calls `cb(newValue)` when this key changes (other tabs included). */
export function onKeyChange(key: string, cb: (value: unknown) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>) => {
    if (key in changes) cb(changes[key]?.newValue);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

/** Calls `cb(value)` when the noTint preference changes (other tabs included). */
export function onNoTintChange(cb: (noTint: boolean) => void): () => void {
  return onKeyChange(NO_TINT_KEY, (v) => cb(v === true));
}

/** Mode of the "minimum gain" filter: off, neutral and profitable, or profitable only. */
export type GainMode = "off" | "neutral" | "positive";
export const GAIN_MODES: readonly GainMode[] = ["off", "neutral", "positive"];

/**
 * Trades tab setting: "minimum gain" filter (`mode` + `pct` = threshold in %, 0 = no threshold
 * on top of the mode) and `sort` = offers sorted from most to least profitable.
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
  const sort = v.sort !== false; // sorting on by default
  if (isMode(v.mode)) return { mode: v.mode, pct: v.pct, sort };
  return { mode: v.on === true ? "neutral" : "off", pct: v.pct, sort };
}

/** Stored "minimum gain" filter. Off at 0 % by default or if the value is corrupted. */
export async function readGainFilter(): Promise<GainFilter> {
  const { [MIN_GAIN_KEY]: v } = await browser.storage.local.get(MIN_GAIN_KEY);
  return toGainFilter(v);
}

export const writeGainFilter = (value: GainFilter): Promise<void> =>
  browser.storage.local.set({ [MIN_GAIN_KEY]: value });

/** Calls `cb(filter)` when the "minimum gain" filter changes (other tabs included). */
export function onGainFilterChange(cb: (filter: GainFilter) => void): () => void {
  return onKeyChange(MIN_GAIN_KEY, (v) => cb(toGainFilter(v)));
}

const toStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Rarities chosen for the filter (empty list = all). Invalid values are ignored. */
export async function readRarities(): Promise<string[]> {
  const { [RARITIES_KEY]: v } = await browser.storage.local.get(RARITIES_KEY);
  return toStrings(v);
}

export const writeRarities = (value: string[]): Promise<void> =>
  browser.storage.local.set({ [RARITIES_KEY]: value });

/** Gain (%) at which the offer tint is at full intensity: the original fixed scale. */
export const DEFAULT_TINT_FULL = 100;

const toTintFull = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : DEFAULT_TINT_FULL;

/** Stored tint scale in %. Default if missing, not a positive number, or corrupted. */
export async function readTintFull(): Promise<number> {
  const { [TINT_FULL_KEY]: v } = await browser.storage.local.get(TINT_FULL_KEY);
  return toTintFull(v);
}

export const writeTintFull = (value: number): Promise<void> =>
  browser.storage.local.set({ [TINT_FULL_KEY]: value });

/** Calls `cb(pct)` when the tint scale changes (other tabs included). */
export function onTintFullChange(cb: (pct: number) => void): () => void {
  return onKeyChange(TINT_FULL_KEY, (v) => cb(toTintFull(v)));
}

/** Calls `cb(rarities)` when the rarity filter changes (other tabs included). */
export function onRaritiesChange(cb: (rarities: string[]) => void): () => void {
  return onKeyChange(RARITIES_KEY, (v) => cb(toStrings(v)));
}

/** Cards the user is looking for (names as typed) and whether to hide offers without one. */
export interface WantedCards {
  names: string[];
  only: boolean;
}

function toWanted(v: unknown): WantedCards {
  return isObject(v) ? { names: toStrings(v.names), only: v.only === true } : { names: [], only: false };
}

/** Stored wanted-cards list. Empty and off by default or if the value is corrupted. */
export async function readWanted(): Promise<WantedCards> {
  const { [WANTED_KEY]: v } = await browser.storage.local.get(WANTED_KEY);
  return toWanted(v);
}

export const writeWanted = (value: WantedCards): Promise<void> =>
  browser.storage.local.set({ [WANTED_KEY]: value });

/** Calls `cb(wanted)` when the wanted-cards list changes (other tabs included). */
export function onWantedChange(cb: (wanted: WantedCards) => void): () => void {
  return onKeyChange(WANTED_KEY, (v) => cb(toWanted(v)));
}
