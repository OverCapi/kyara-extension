// Clickable pill styled like the site's pills: `aria-pressed="true"` = active.
// Used by the filter panel and by the features that put their settings in it.

/** Creates a pill (button) with this text. No listener: up to the caller to add one. */
export function makePill(text: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "kv-pill";
  button.textContent = text;
  button.setAttribute("aria-pressed", "false");
  return button;
}
