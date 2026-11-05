// Appels à l'API kyara.games depuis le content script, avec les mêmes en-têtes que le site :
// jeton et device id lus dans le localStorage du site. Le jeton n'est envoyé qu'à /api du même site.
// `kyaraFetch` ne lève jamais d'exception : tout échec devient `{ ok: false }`.

import { pageFetch } from "../core/firefox";
import { createLogger } from "../core/log";

const log = createLogger("api");

export interface ApiResult {
  ok: boolean;
  /** Code HTTP, 0 si la requête n'a pas abouti (réseau, JSON illisible). */
  status: number;
  /** Corps JSON, `null` si échec. */
  data: unknown;
}

/** En-têtes d'authentification du site. Vides si le localStorage est inaccessible ou sans jeton. */
export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const token = localStorage.getItem("kyara_token");
    const device = localStorage.getItem("kyara_device");
    if (token) headers.authorization = `Bearer ${token}`;
    if (device) headers["x-device-id"] = device;
  } catch (err) {
    log.debug("localStorage inaccessible, requête sans jeton", err);
  }
  return headers;
}

/** GET `/api<path>` (ex. "/me/collection?lean=1"). */
export async function kyaraFetch(path: string): Promise<ApiResult> {
  try {
    const r = await pageFetch()(`/api${path}`, { headers: authHeaders() });
    if (!r.ok) return { ok: false, status: r.status, data: null };
    return { ok: true, status: r.status, data: await r.json() };
  } catch (err) {
    log.debug(`${path} : échec`, err);
    return { ok: false, status: 0, data: null };
  }
}
