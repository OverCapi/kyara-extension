// Ambient backdrop of the profile page: the focused card's art, blurred behind the header.
// CSS draws two layers (::before, ::after on the page element) and crossfades them: background images cannot be
// animated, so the new art goes on the hidden layer, which then becomes the visible one.
// DOM effect: --kv-bd-a / --kv-bd-b variables and data-kv-bd attribute on the page element.

export interface Ambient {
  /** Shows `url` (a CDN card image, already validated) behind `page`. Does nothing if already shown. */
  show(page: HTMLElement, url: string): void;
  /** The art currently shown, `null` before the first `show`. */
  current(): string | null;
}

/** Creates the backdrop. */
export function createAmbient(): Ambient {
  let shown: string | null = null;
  let shownOn: HTMLElement | null = null;
  let layer: "a" | "b" = "b";
  return {
    show(page, url) {
      if (page === shownOn && url === shown) return;
      layer = layer === "a" ? "b" : "a";
      page.style.setProperty(`--kv-bd-${layer}`, `url("${url}")`);
      page.setAttribute("data-kv-bd", layer);
      shown = url;
      shownOn = page;
    },
    current: () => shown,
  };
}
