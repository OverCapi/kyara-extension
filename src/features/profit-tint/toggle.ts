// Pastille "Rentabilité on/off" (textes : locales/*.json) : petit bouton fixe en bas à gauche, visible seulement quand la page
// contient des offres. Ajoutée à <html> (hors de l'arbre du site). Le choix est mémorisé dans le
// stockage (clé noTint) et suivi en direct, y compris depuis un autre onglet.
// Effet : classe `kv-no-tint` sur <html> quand les couleurs sont coupées (le CSS retire alors le fond).
import { safeAsync } from "../../core/errors";
import { t } from "../../core/i18n";
import { listen, mountFloating, type PageContext } from "../../core/page";
import { onNoTintChange, readNoTint, writeNoTint } from "../../core/storage";

export interface Toggle {
  setVisible(visible: boolean): void;
}

/** Crée la pastille et branche son comportement. */
export function createToggle(page: PageContext): Toggle {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "kv-toggle";
  button.title = t("toggle.title");
  button.hidden = true;
  mountFloating(page, button);

  const apply = (noTint: boolean) => {
    document.documentElement.classList.toggle("kv-no-tint", noTint);
    button.textContent = t(noTint ? "toggle.off" : "toggle.on");
    button.setAttribute("aria-pressed", String(!noTint));
  };
  const flip = safeAsync("toggle:click", () =>
    writeNoTint(!document.documentElement.classList.contains("kv-no-tint")),
  );
  listen(page, button, "click", () => void flip());
  page.onInvalidated(onNoTintChange(apply));
  void safeAsync("toggle:init", async () => apply(await readNoTint()))();

  return {
    setVisible(visible) {
      button.hidden = !visible;
    },
  };
}
