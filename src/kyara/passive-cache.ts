// Passive cache (background): reads the JSON responses the site already loads, without extra requests,
// and stores them via parseResponse. The page ALWAYS receives the untouched response,
// even if parsing fails: an extension error must never break the site.
import { browser } from "wxt/browser";
import { safeAsync } from "../core/errors";
import { filterResponseData } from "../core/firefox";
import { createLogger } from "../core/log";
import { writeEntries } from "../core/storage";
import { parseResponse } from "./parse";

const log = createLogger("passive-cache");

/** Watched API URLs. */
export const WATCHED_URLS = [
  "https://kyara.games/api/market/listings*",
  "https://kyara.games/api/market/prices/*",
  "https://kyara.games/api/characters/*",
  "https://kyara.games/api/fair-play/prices*",
];

/** Parses a response body and stores what it contains. Never throws. */
export const storeBody = safeAsync("passive-cache:store", async (url: string, text: string) => {
  const found = parseResponse(url, JSON.parse(text));
  if (Object.keys(found).length === 0) return;
  log.debug(url, "->", Object.keys(found).length, "entries");
  await writeEntries(found);
});

/** Plugs a filter on the response: the stream is copied as is to the page, then parsed at the end. */
export function interceptResponse(url: string, requestId: string): void {
  const filter = filterResponseData(requestId);
  if (!filter) return;
  const decoder = new TextDecoder();
  let text = "";
  filter.ondata = (e) => {
    try {
      text += decoder.decode(e.data, { stream: true });
    } finally {
      filter.write(e.data); // the page receives the untouched response, whatever happens
    }
  };
  filter.onstop = () => {
    filter.close();
    void storeBody(url, text + decoder.decode()); // never rejects (safeAsync)
  };
  filter.onerror = () => log.error("filter error", url, filter.error);
}

/** Starts listening to GET requests to the watched API. */
export function startPassiveCache(): void {
  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.method !== "GET") return undefined;
      try {
        interceptResponse(details.url, details.requestId);
      } catch (err) {
        log.error("interception failed", details.url, err); // the request goes on without a filter
      }
      return undefined;
    },
    { urls: WATCHED_URLS },
    ["blocking"],
  );
  log.debug("loaded");
}
