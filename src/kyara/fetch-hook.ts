// Runs IN THE PAGE (MAIN world, injected by entrypoints/page-hook.ts), not in the content script: no browser.*.
// Wraps window.fetch to:
//  1. read the free boosters from the site's own responses -> attributes on <html> (storePackData);
//  2. when the free-packs feature set OPEN_COUNT_ATTR on <html>, rewrite the bulk-open request to open
//     exactly that many boosters with maxChakra 0. The site keeps its own opening animation.
// Never breaks the site: on any failure the request and the response go through untouched. ONE exception,
// on purpose: while the free-only choice is on, a booster-opening request the hook cannot rewrite (the site
// changed its API) is refused, so it can never spend chakra the user did not choose to spend. The site
// shows its own error and nothing is lost.
import { safeAsync } from "../core/errors";
import { t } from "../core/i18n";
import { HOOK_ATTR, OPEN_COUNT_ATTR, opensPacks, pathOf, rewriteOpenMany, storePackData } from "./packs";

/** API responses that carry the pack list or the user's free boosters. */
const WATCHED = /^\/api\/(me|me\/bootstrap|packs(\/[^/]+\/open(-many)?)?)$/;

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

/** Installs the hook on `win.fetch`. */
export function installFetchHook(win: Window & typeof globalThis): void {
  const original = win.fetch;
  const html = win.document.documentElement;
  const observe = safeAsync("fetch-hook:observe", async (res: Response) => {
    storePackData(await res.json(), html);
  });

  /** `init` to send: unchanged, rewritten for a free-only open, or `null` = refuse the request. */
  const prepare = (input: RequestInfo | URL, init?: RequestInit): RequestInit | undefined | null => {
    const n = Number(html.getAttribute(OPEN_COUNT_ATTR));
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (!(n > 0) || !opensPacks(urlOf(input), method)) return init;
    const body = rewriteOpenMany(urlOf(input), init?.body, n);
    return body === null ? null : { ...init, body };
  };

  const hooked: typeof fetch = async (input, init) => {
    const url = urlOf(input);
    const sent = prepare(input, init);
    if (sent === null) throw new TypeError(t("packs.refused"));
    const res = await original.call(win, input, sent);
    if (res.ok && WATCHED.test(pathOf(url) ?? "")) void observe(res.clone());
    return res;
  };
  win.fetch = hooked;
  html.toggleAttribute(HOOK_ATTR, true);
}
