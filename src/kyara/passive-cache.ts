// Cache passif (background) : lit les réponses JSON que le site charge déjà, sans requête en plus,
// et les range dans le stockage via parseResponse. La page reçoit TOUJOURS la réponse intacte,
// même si l'analyse échoue : une erreur de l'extension ne doit jamais casser le site.
import { browser } from "wxt/browser";
import { safeAsync } from "../core/errors";
import { filterResponseData } from "../core/firefox";
import { createLogger } from "../core/log";
import { writeEntries } from "../core/storage";
import { parseResponse } from "./parse";

const log = createLogger("passive-cache");

/** Adresses d'API surveillées. */
export const WATCHED_URLS = [
  "https://kyara.games/api/market/listings*",
  "https://kyara.games/api/market/prices/*",
  "https://kyara.games/api/characters/*",
  "https://kyara.games/api/fair-play/prices*",
  "https://kyara.games/api/me/collection*",
];

/** Analyse un corps de réponse et stocke ce qu'il contient. Ne lève jamais. */
export const storeBody = safeAsync("passive-cache:store", async (url: string, text: string) => {
  const found = parseResponse(url, JSON.parse(text));
  if (Object.keys(found).length === 0) return;
  log.debug(url, "->", Object.keys(found).length, "entrées");
  await writeEntries(found);
});

/** Branche un filtre sur la réponse : le flux est recopié tel quel vers la page, puis analysé à la fin. */
export function interceptResponse(url: string, requestId: string): void {
  const filter = filterResponseData(requestId);
  if (!filter) return;
  const decoder = new TextDecoder();
  let text = "";
  filter.ondata = (e) => {
    try {
      text += decoder.decode(e.data, { stream: true });
    } finally {
      filter.write(e.data); // la page reçoit la réponse intacte, quoi qu'il arrive
    }
  };
  filter.onstop = () => {
    filter.close();
    void storeBody(url, text + decoder.decode()); // ne rejette jamais (safeAsync)
  };
  filter.onerror = () => log.error("filtre en erreur", url, filter.error);
}

/** Démarre l'écoute des requêtes GET vers l'API surveillée. */
export function startPassiveCache(): void {
  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.method !== "GET") return undefined;
      try {
        interceptResponse(details.url, details.requestId);
      } catch (err) {
        log.error("interception impossible", details.url, err); // la requête continue sans filtre
      }
      return undefined;
    },
    { urls: WATCHED_URLS },
    ["blocking"],
  );
  log.debug("chargé");
}
