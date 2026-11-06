// Firefox-only APIs, missing from WXT's types. Isolated here so the rest of the code stays typed.
// Neither accessor ever throws: they return a fallback when the API is missing.
import { browser } from "wxt/browser";

/** Stream filter returned by webRequest.filterResponseData (Firefox, blocking MV2). */
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

/** Opens a filter on a request's response, or `null` if the API does not exist. */
export function filterResponseData(requestId: string): ResponseFilter | null {
  const api = browser.webRequest as unknown as FirefoxWebRequest;
  return api.filterResponseData?.(requestId) ?? null;
}

/**
 * `fetch` to use from the content script. Firefox exposes `content.fetch`: the request is made
 * as the page would (same origin, same cookies). Otherwise, the regular `fetch`.
 */
export function pageFetch(): typeof fetch {
  const page = (globalThis as { content?: { fetch?: typeof fetch } }).content;
  return page?.fetch ? page.fetch.bind(page) : fetch;
}
