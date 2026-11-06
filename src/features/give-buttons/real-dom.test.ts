import { describe, expect, it } from "vitest";
import { readOffers } from "../../kyara/dom";
import { startFeature } from "../../test/helpers";
import { giveButtons } from "./index";

// Offer copied from kyara.games (logged in), Svelte comments and classes kept.
const HTML =
  '<li class="offer svelte-x" id="offre-abc"><div class="top svelte-x"><div class="give svelte-x">' +
  '<a class="big svelte-x" href="/wiki/1" title="Sumire Akane"><img alt="Sumire Akane"></a></div>' +
  '<div class="arrow svelte-x" aria-hidden="true">⇄</div><div class="want svelte-x"><div class="thumbs svelte-x"><!---->' +
  '<a class="thumb svelte-x" href="/wiki/2" title="Suzaku (tu l’as)"><img alt="Suzaku"></a><!---->' +
  '<a class="thumb svelte-x" href="/wiki/3" title="Sagittarius (tu l’as)"><img alt="Sagittarius"></a></div></div></div> ' +
  '<div class="acts svelte-7j21ia"><!----><button class="btn btn-acc btn-sm" type="button">Donner Suzaku ' +
  '<span class="own mono svelte-7j21ia">×1</span></button><button class="btn btn-acc btn-sm" type="button">' +
  'Donner Sagittarius <span class="own mono svelte-7j21ia">×1</span></button><!----> <!----> ' +
  '<button class="btn btn-ghost btn-sm" type="button">Proposer autre chose</button><!----><!----></div></li>';

describe("give-buttons on the real site's DOM", () => {
  it("labels and sorts the give buttons", () => {
    document.body.innerHTML = `<ul>${HTML}</ul>`;
    const fair = { 1: { v: 10, t: 0 }, 2: { v: 15, t: 0 }, 3: { v: 5, t: 0 } };
    startFeature(giveButtons).emit({ offers: readOffers(), store: { fair, market: {} }, owned: null });
    const [suzaku, sagittarius, other] = [...document.querySelectorAll<HTMLElement>(".acts button")];
    expect(suzaku?.dataset.kvGain).toBe("-5◆ · -33 %");
    expect(sagittarius?.dataset.kvGain).toBe("+5◆ · +100 %");
    expect([sagittarius?.style.order, suzaku?.style.order]).toEqual(["0", "1"]);
    expect(other?.hasAttribute("data-kv-give")).toBe(false);
  });
});
