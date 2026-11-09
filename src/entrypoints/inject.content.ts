// Content script started before the site's own scripts (document_start): injects page-hook.js into the page,
// so the fetch hook is in place before the site's first API calls. No logic here.
import { safeAsync } from "../core/errors";

export default defineContentScript({
  matches: ["https://kyara.games/*"],
  runAt: "document_start",
  main: safeAsync("inject", async () => {
    await injectScript("/page-hook.js");
  }),
});
