// Free boosters per pack, read from the site's API responses (`/api/me`, bootstrap, pack list, open
// results), and the rewrite of the bulk-open request. Pure functions, shared by the page hook
// (kyara/fetch-hook.ts, MAIN world) and the content script (kyara/pack-data.ts, features/free-packs).
// Both sides talk through attributes on <html>: either side may write the wallet and the free pack ids,
// whoever saw them last (the hook can miss the site's first requests if it is injected late).
// No function throws: unexpected data -> null / empty result.
import { createLogger } from "../core/log";

const log = createLogger("packs");

/** On <html>, set by the page hook once it wraps fetch: without it, nothing may rely on a rewrite. */
export const HOOK_ATTR = "data-kv-hook";
/** On <html>: the user's free boosters, JSON `Wallet`. */
export const WALLET_ATTR = "data-kv-wallet";
/** On <html>: ids of the packs that use the shared free stock, JSON `string[]`. */
export const FREE_IDS_ATTR = "data-kv-free-ids";
/** On <html>, set by the free-packs feature: the next bulk open must open exactly this many, without chakra. */
export const OPEN_COUNT_ATTR = "data-kv-open-count";

/** Boosters that cost nothing: the shared free stock (`free` + `bonus` packs) and per-pack gifts. */
export interface Wallet {
  free: number;
  grants: Record<string, number>;
}
/** Free boosters you can open, per pack id. */
export type FreePacks = Record<string, number>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const count = (v: unknown): number => (typeof v === "number" && v > 0 ? Math.floor(v) : 0);

/**
 * The user in a response: `/api/me` itself, bootstrap `me`, single open `user`, or `user` of the last bulk
 * open result.
 */
function findUser(json: Record<string, unknown>): Record<string, unknown> | null {
  const results = Array.isArray(json.results) ? json.results : [];
  const last: unknown = results.at(-1);
  const users = [json, json.me, json.user, isRecord(last) ? last.user : undefined];
  return users.find((u): u is Record<string, unknown> => isRecord(u) && "freePacks" in u) ?? null;
}

/** Free boosters of the user found in an API response. `null` if the response has no user. */
export function parseWallet(json: unknown): Wallet | null {
  const user = isRecord(json) ? findUser(json) : null;
  if (!user) return null;
  const grants = isRecord(user.grants) ? user.grants : {};
  return {
    free: count(user.freePacks) + count(user.bonusPacks),
    grants: Object.fromEntries(Object.entries(grants).map(([id, n]) => [id, count(n)])),
  };
}

/** Ids of the packs that use the shared free stock, from `/api/packs`. `null` if it is not a pack list. */
export function parseFreePackIds(json: unknown): string[] | null {
  if (!Array.isArray(json)) return null;
  // same rule as the site: `usesFreePacks`, or a price of 0 when the field is missing
  const usesFree = (p: Record<string, unknown>) => (p.usesFreePacks ?? p.price === 0) === true;
  return json.filter(isRecord).flatMap((p) => (typeof p.id === "string" && usesFree(p) ? [p.id] : []));
}

/** Free boosters per pack: its own gifts, plus the shared stock for the packs that use it. */
export function freePacks(wallet: Wallet, freeIds: string[]): FreePacks {
  const out: FreePacks = { ...wallet.grants };
  for (const id of freeIds) out[id] = (out[id] ?? 0) + wallet.free;
  return out;
}

/** JSON of an attribute of `root`, `null` if missing or invalid. */
function readAttr(root: Element, name: string): unknown {
  try {
    return JSON.parse(root.getAttribute(name) ?? "null");
  } catch (err) {
    log.debug(`invalid ${name}, ignored`, err);
    return null;
  }
}

/** Wallet stored on <html>, `null` if missing or invalid. */
export function readWallet(root: Element = document.documentElement): Wallet | null {
  const json = readAttr(root, WALLET_ATTR);
  if (!isRecord(json) || typeof json.free !== "number") return null;
  return parseWallet({ freePacks: json.free, grants: json.grants });
}

/** Free pack ids stored on <html>, `null` if missing or invalid. */
export function readFreeIds(root: Element = document.documentElement): string[] | null {
  const json = readAttr(root, FREE_IDS_ATTR);
  return Array.isArray(json) ? json.filter((id): id is string => typeof id === "string") : null;
}

/** Stores what an API response tells about free boosters (wallet and/or free pack ids) on <html>. */
export function storePackData(json: unknown, root: Element = document.documentElement): void {
  const wallet = parseWallet(json);
  const ids = parseFreePackIds(json);
  if (wallet) root.setAttribute(WALLET_ATTR, JSON.stringify(wallet));
  if (ids) root.setAttribute(FREE_IDS_ATTR, JSON.stringify(ids));
}

/** Free boosters per pack from what is stored on <html>. Empty while the wallet or the pack ids are unknown. */
export function readFreePacks(root: Element = document.documentElement): FreePacks {
  const wallet = readWallet(root);
  const ids = readFreeIds(root);
  return wallet && ids ? freePacks(wallet, ids) : {};
}

/** Pack id of a booster opening page (`/ouvrir/<id>`), `null` on any other page. */
export function openPagePack(path: string): string | null {
  const id = /^\/ouvrir\/([^/]+)\/?$/.exec(path)?.[1];
  return id ? decodeURIComponent(id) : null;
}

/** Path of a URL, absolute or relative to the site. `null` if it cannot be read. */
export function pathOf(url: string): string | null {
  try {
    return new URL(url, "https://kyara.games").pathname;
  } catch (err) {
    log.debug("unreadable URL", err);
    return null;
  }
}

/** `true` for a POST that opens boosters (any `/api/packs/<id>/<action>`): it may spend chakra. */
export function opensPacks(url: string, method: string): boolean {
  return method.toUpperCase() === "POST" && /^\/api\/packs\/[^/]+\/./.test(pathOf(url) ?? "");
}

/**
 * Body of a bulk-open request (`POST /api/packs/<id>/open-many`) rewritten to open exactly `n` boosters
 * with `maxChakra: 0` (the server refuses to spend chakra). `null` = leave the request untouched
 * (other URL, body not a JSON object with a numeric `count`, n not an integer >= 1).
 */
export function rewriteOpenMany(url: string, body: unknown, n: number): string | null {
  if (
    !Number.isInteger(n) ||
    n < 1 ||
    typeof body !== "string" ||
    !/^\/api\/packs\/[^/]+\/open-many$/.test(pathOf(url) ?? "")
  ) {
    return null;
  }
  try {
    const json: unknown = JSON.parse(body);
    // no `count`: the site changed its format, a rewrite could not be trusted
    if (!isRecord(json) || typeof json.count !== "number") return null;
    return JSON.stringify({ ...json, count: n, maxChakra: 0 });
  } catch (err) {
    log.debug("open-many body is not JSON, left untouched", err);
    return null;
  }
}
