// Pastille cliquable au style des pastilles du site : `aria-pressed="true"` = active.
// Utilisée par le panneau de filtres et par les features qui y rangent leurs réglages.

/** Crée une pastille (bouton) avec ce texte. Aucun écouteur : à l'appelant d'en brancher. */
export function makePill(text: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "kv-pill";
  button.textContent = text;
  button.setAttribute("aria-pressed", "false");
  return button;
}
