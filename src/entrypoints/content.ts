// Point d'entrée du content script (pages kyara.games) : démarre les features. Aucune logique ici.
import { features } from "../features";
import { startFeatures } from "../features/runtime";

export default defineContentScript({
  matches: ["https://kyara.games/*"],
  main(ctx) {
    startFeatures(ctx, features);
  },
});
