import { defineConfig } from "wxt";
import en from "./src/locales/en.json";

// Config WXT : code source dans src/. Nom et description du manifest : src/locales/en.json. Deux cibles :
//   Firefox (MV2) : complet. MV2 obligatoire, webRequest.filterResponseData (cache passif) n'existe que là.
//   Chrome (MV3)  : sans cache passif (pas de background), les prix viennent des requêtes fair-play.
export default defineConfig({
  srcDir: "src",
  // `pnpm dev` : Firefox s'ouvre sur les Échanges, l'extension se recharge à chaque modification.
  // Profil gardé dans .firefox-profile/ (non versionné) : la connexion à kyara.games reste d'une fois sur l'autre.
  webExt: {
    firefoxProfile: ".firefox-profile",
    keepProfileChanges: true,
    startUrls: ["https://kyara.games/marche?onglet=offres"],
  },
  // Extension locale existante : pas encore soumise à addons.mozilla.org, donc exemptée du champ data_collection_permissions.
  suppressWarnings: { firefoxDataCollection: true },
  manifest: ({ browser }) => ({
    name: en["manifest.name"],
    description: en["manifest.description"],
    version: "0.1.0",
    permissions:
      browser === "firefox"
        ? ["webRequest", "webRequestBlocking", "storage", "https://kyara.games/*"]
        : ["storage"],
    host_permissions: browser === "firefox" ? undefined : ["https://kyara.games/*"],
    browser_specific_settings:
      browser === "firefox"
        ? { gecko: { id: "kyara-extension@local", strict_min_version: "115.0" } }
        : undefined,
  }),
});
