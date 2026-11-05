// Petit indicateur « chargement » (anneau qui tourne + texte) affiché pendant que load-more charge
// d'autres offres. Pastille fixe en bas au centre, ajoutée à <html> (hors de l'arbre du site).
// Retirée quand l'extension est rechargée. Texte : locales/*.json.
import { t } from "../../core/i18n";
import { mountFloating, type PageContext } from "../../core/page";

export interface Indicator {
  show(): void;
  hide(): void;
}

/** Crée l'indicateur (caché au départ). */
export function createIndicator(page: PageContext): Indicator {
  const el = document.createElement("div");
  el.className = "kv-loading";
  el.setAttribute("role", "status"); // annoncé par les lecteurs d'écran
  el.hidden = true;
  const spinner = document.createElement("span");
  spinner.className = "kv-spinner";
  spinner.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = t("load.more");
  el.append(spinner, text);
  mountFloating(page, el);
  return {
    show() {
      el.hidden = false;
    },
    hide() {
      el.hidden = true;
    },
  };
}
