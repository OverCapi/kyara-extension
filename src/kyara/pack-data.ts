// Content script side of the free boosters: reads them from the API itself, because the page hook only sees
// the site's own requests and can miss the first ones (injected late), and because free boosters refill
// over time. Network: GET /api/me (~600 B) on each booster opening page, GET /api/packs once.
// Effect: wallet / free pack ids attributes on <html> (see packs.ts).
import { kyaraFetch } from "./api";
import { readFreeIds, storePackData } from "./packs";

/** Refreshes the stored wallet, and the free pack ids if still unknown. Never throws (kyaraFetch). */
export async function refreshPackData(): Promise<void> {
  const [me, packs] = await Promise.all([kyaraFetch("/me"), readFreeIds() ? null : kyaraFetch("/packs")]);
  if (me.ok) storePackData(me.data);
  if (packs?.ok) storePackData(packs.data);
}
