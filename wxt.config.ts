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
  // Sources archive sent to AMO reviewers: never the AMO keys (.env), nor local or generated folders.
  zip: { excludeSources: [".env", ".env.*", "coverage/**", ".firefox-profile/**", "web-ext-artifacts/**"] },
  manifest: ({ browser }) => ({
    name: en["manifest.name"],
    description: en["manifest.description"],
    permissions:
      browser === "firefox"
        ? ["webRequest", "webRequestBlocking", "storage", "https://kyara.games/*"]
        : ["storage"],
    host_permissions: browser === "firefox" ? undefined : ["https://kyara.games/*"],
    // Listed on addons.mozilla.org: AMO delivers updates, so no update_url (AMO rejects it for listed add-ons).
    // Keep this id: copies installed from the old GitHub releases share it and update from AMO.
    // data_collection_permissions: the extension sends nothing anywhere except kyara.games' own API.
    browser_specific_settings:
      browser === "firefox"
        ? {
            gecko: {
              id: "kyara-extension@local",
              // 140 = current ESR, first version that knows data_collection_permissions
              strict_min_version: "140.0",
              data_collection_permissions: { required: ["none"] },
            },
            gecko_android: { strict_min_version: "142.0" }, // first Android version that knows it
          }
        : undefined,
  }),
});
