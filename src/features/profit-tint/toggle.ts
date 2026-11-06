// "Profitability on/off" pill (texts: locales/*.json): small fixed button bottom left, only visible when the page
// has offers. Appended to <html> (outside the site's tree). The choice is stored
// (noTint key) and followed live, including from another tab.
// Effect: `kv-no-tint` class on <html> when colors are off (CSS then removes the background).
import { safeAsync } from "../../core/errors";
import { t } from "../../core/i18n";
import { listen, mountFloating, type PageContext } from "../../core/page";
import { onNoTintChange, readNoTint, writeNoTint } from "../../core/storage";

export interface Toggle {
  setVisible(visible: boolean): void;
}

/** Creates the pill and wires its behavior. */
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
