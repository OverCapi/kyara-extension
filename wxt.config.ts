import { defineConfig } from "wxt";
import en from "./src/locales/en.json";

// WXT config: source code in src/. Manifest name and description: src/locales/en.json. Two targets:
//   Firefox (MV2): full. MV2 required, webRequest.filterResponseData (passive cache) only exists there.
//   Chrome (MV3) : no passive cache (no background), prices come from the fair-play requests.
export default defineConfig({
  srcDir: "src",
  // `pnpm dev`: Firefox opens on the Trades tab, the extension reloads on every change.
  // Profile kept in .firefox-profile/ (not versioned): the kyara.games login persists between runs.
  webExt: {
    firefoxProfile: ".firefox-profile",
    keepProfileChanges: true,
    startUrls: ["https://kyara.games/marche?onglet=offres"],
  },
  // Existing local extension: not submitted to addons.mozilla.org yet, so exempt from the data_collection_permissions field.
  suppressWarnings: { firefoxDataCollection: true },
  manifest: ({ browser }) => ({
    name: en["manifest.name"],
    description: en["manifest.description"],
    permissions:
      browser === "firefox"
        ? ["webRequest", "webRequestBlocking", "storage", "https://kyara.games/*"]
        : ["storage"],
    host_permissions: browser === "firefox" ? undefined : ["https://kyara.games/*"],
    // update_url: Firefox checks there (~every 24 h) for a newer version,
    // then installs the signed .xpi by itself. updates.json is published by scripts/release.sh.
    browser_specific_settings:
      browser === "firefox"
        ? {
            gecko: {
              id: "kyara-extension@local",
              strict_min_version: "115.0",
              update_url: "https://github.com/OverCapi/kyara-extension/releases/latest/download/updates.json",
            },
          }
        : undefined,
  }),
});
