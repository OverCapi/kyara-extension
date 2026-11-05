import { defineConfig } from "wxt";

// Config WXT : extension Firefox (MV2), code source dans src/.
// MV2 obligatoire : webRequest.filterResponseData (cache passif) n'existe qu'en MV2 sur Firefox.
export default defineConfig({
  srcDir: "src",
  // Extension locale existante : pas encore soumise à addons.mozilla.org, donc exemptée du champ data_collection_permissions.
  suppressWarnings: { firefoxDataCollection: true },
  manifest: {
    name: "Kyara Extension",
    description: "Affiche la valeur des cartes et la rentabilité des échanges sur kyara.games.",
    version: "0.1.0",
    permissions: ["webRequest", "webRequestBlocking", "storage", "https://kyara.games/*"],
    browser_specific_settings: {
      gecko: { id: "kyara-extension@local", strict_min_version: "115.0" },
    },
  },
});
