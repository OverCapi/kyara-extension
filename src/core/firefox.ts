// API propres à Firefox, absentes des types de WXT. Isolées ici pour que le reste du code reste typé.
// Les deux accesseurs ne lèvent jamais : ils renvoient un repli si l'API est absente.
import { browser } from "wxt/browser";

/** Filtre de flux renvoyé par webRequest.filterResponseData (Firefox, MV2 bloquant). */
export interface ResponseFilter {
  ondata: ((event: { data: ArrayBuffer }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
  error: string;
  write(data: ArrayBuffer): void;
  close(): void;
}

interface FirefoxWebRequest {
  filterResponseData?: (requestId: string) => ResponseFilter;
}

/** Ouvre un filtre sur la réponse d'une requête, ou `null` si l'API n'existe pas. */
export function filterResponseData(requestId: string): ResponseFilter | null {
  const api = browser.webRequest as unknown as FirefoxWebRequest;
  return api.filterResponseData?.(requestId) ?? null;
}

/**
 * `fetch` à utiliser depuis le content script. Firefox expose `content.fetch` : requête faite
 * comme la page (même origine, mêmes cookies). Sinon, le `fetch` normal.
 */
export function pageFetch(): typeof fetch {
  const page = (globalThis as { content?: { fetch?: typeof fetch } }).content;
  return page?.fetch ? page.fetch.bind(page) : fetch;
}
