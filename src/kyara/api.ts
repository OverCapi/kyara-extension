// Calls to the kyara.games API from the content script, with the same headers as the site:
// token and device id read from the site's localStorage. The token is only sent to the same site's /api.
// `kyaraFetch` never throws: any failure becomes `{ ok: false }`.

import { pageFetch } from "../core/firefox";
import { createLogger } from "../core/log";

const log = createLogger("api");

export interface ApiResult {
  ok: boolean;
  /** HTTP status, 0 if the request did not complete (network, unreadable JSON). */
  status: number;
  /** JSON body, `null` on failure. */
  data: unknown;
}

/**
 * A value of the site's localStorage: its known key, otherwise the first key matching `pattern` (the site
 * renamed it). Only ever sent back to the same site's /api.
 */
function siteValue(known: string, pattern: RegExp): string | null {
  const direct = localStorage.getItem(known);
  if (direct) return direct;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && pattern.test(key)) return localStorage.getItem(key);
  }
  return null;
}

/** The site's auth headers. Empty if localStorage is unreachable or has no token. */
export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const token = siteValue("kyara_token", /token/i);
    const device = siteValue("kyara_device", /device/i);
    if (token) headers.authorization = `Bearer ${token}`;
    if (device) headers["x-device-id"] = device;
  } catch (err) {
    log.debug("localStorage unreachable, request without token", err);
  }
  return headers;
}

/** GET `/api<path>` (e.g. "/fair-play/prices?ids=1,2"). */
export async function kyaraFetch(path: string): Promise<ApiResult> {
  try {
    const r = await pageFetch()(`/api${path}`, { headers: authHeaders() });
    if (!r.ok) return { ok: false, status: r.status, data: null };
    return { ok: true, status: r.status, data: await r.json() };
  } catch (err) {
    log.debug(`${path}: failed`, err);
    return { ok: false, status: 0, data: null };
  }
}
