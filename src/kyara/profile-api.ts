// Public data of a player's profile, as the profile page loads it: GET /api/users/<id>. Used by profile-showcase to
// show the collection and the trades under the showcase, on one page. Validates the shape: anything unexpected is
// dropped, and a response that is not a profile gives `null`. Network: one request per call (the caller caches).
import { kyaraFetch } from "./api";

/** A card of the wishlist or of the doubles. `spare` = copies offered (0 for a wanted card). */
export interface ProfileCard {
  id: number;
  name: string;
  rarity: string;
  series: string;
  spare: number;
}
/** How much of a series the player owns. */
export interface SeriesProgress {
  name: string;
  owned: number;
  total: number;
}
/** What the profile page shows under its Collection and Trades tabs. */
export interface ProfileData {
  feminine: boolean;
  owned: number;
  catalogSize: number;
  byRarity: Record<string, number>;
  series: SeriesProgress[];
  wishlist: ProfileCard[];
  wishlistCount: number;
  doubles: ProfileCard[];
  doublesCount: number;
}

const PROFILE_PATH = /^\/profil\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** Player id of a `/profil/<uuid>` path, `null` for any other path (own profile without id included). */
export const profileIdFromPath = (path: string): string | null => PROFILE_PATH.exec(path)?.[1] ?? null;

/** Image of a card on the site's CDN (small size, the one the site uses in lists). */
export const cardImageUrl = (id: number): string => `https://cdn.kyara.games/cards/sm/${id}.webp`;

function toCard(v: unknown): ProfileCard[] {
  if (!isRecord(v) || !Number.isInteger(v.id) || typeof v.name !== "string") return [];
  return [
    {
      id: v.id as number,
      name: v.name,
      rarity: text(v.rarity),
      series: text(v.series),
      spare: count(v.spare),
    },
  ];
}

function toSeries(v: unknown): SeriesProgress[] {
  if (!isRecord(v) || typeof v.name !== "string" || count(v.total) === 0) return [];
  return [{ name: v.name, owned: count(v.owned), total: count(v.total) }];
}

const list = <T>(v: unknown, read: (item: unknown) => T[]): T[] => (Array.isArray(v) ? v.flatMap(read) : []);

function toRarities(v: unknown): Record<string, number> {
  if (!isRecord(v)) return {};
  return Object.fromEntries(Object.entries(v).map(([k, n]) => [k, count(n)]));
}

/** Profile response -> `ProfileData`. `null` if it does not look like a profile. */
export function parseProfile(json: unknown): ProfileData | null {
  if (!isRecord(json) || typeof json.pseudo !== "string") return null;
  const wishlist = list(json.wishlist, toCard);
  const doubles = list(json.doubles, toCard);
  return {
    feminine: json.feminine === true,
    owned: count(json.owned),
    catalogSize: count(json.catalogSize),
    byRarity: toRarities(json.byRarity),
    series: list(json.series, toSeries),
    wishlist,
    wishlistCount: Math.max(count(json.wishlistCount), wishlist.length),
    doubles,
    doublesCount: Math.max(count(json.doublesCount), doubles.length),
  };
}

/** Fetches a player's profile. `null` on any failure (network, HTTP error, unexpected shape). */
export async function fetchProfile(id: string): Promise<ProfileData | null> {
  const result = await kyaraFetch(`/users/${encodeURIComponent(id)}`);
  return result.ok ? parseProfile(result.data) : null;
}
