// Point d'entrée du script de fond : démarre le cache passif des prix. Aucune logique ici.
import { startPassiveCache } from "../kyara/passive-cache";

export default defineBackground(() => {
  startPassiveCache();
});
