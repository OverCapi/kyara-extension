// Point d'entrée du script de fond : démarre le cache passif des prix. Aucune logique ici.
// Firefox uniquement : le cache passif repose sur filterResponseData, absent de Chrome.
// ponytail: pas de cache passif sur Chrome ; script MAIN world qui intercepte fetch si le volume de requêtes gêne.
import { startPassiveCache } from "../kyara/passive-cache";

export default defineBackground(() => {
  // constante de build : sur Chrome, le cache passif est retiré du bundle
  if (import.meta.env.FIREFOX) startPassiveCache();
});
