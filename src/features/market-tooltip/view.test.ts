import { describe, expect, it } from "vitest";
import { type TipState, tipNodes, tipPosition } from "./view";

const tipHtml = (name: string, state: TipState) => {
  const box = document.createElement("div");
  box.append(...tipNodes(name, state));
  return box.innerHTML;
};

describe("tipNodes", () => {
  it("loading", () => {
    expect(tipHtml("Saber", { kind: "loading" })).toContain("…");
  });
  it("unavailable", () => {
    expect(tipHtml("Saber", { kind: "error" })).toContain("indisponible");
  });
  it("no listing", () => {
    expect(tipHtml("Saber", { kind: "result", data: { min: null, count: 0 } })).toContain("aucune annonce");
  });
  it("price and plural", () => {
    const one = tipHtml("S", { kind: "result", data: { min: 7, count: 1 } });
    const many = tipHtml("S", { kind: "result", data: { min: 7, count: 3 } });
    expect(one).toContain("7<i>◆</i>");
    expect(one).toContain("1 annonce<");
    expect(many).toContain("3 annonces<");
  });
  it("keeps the name coming from the site as text, never as HTML", () => {
    const html = tipHtml('<img src=x onerror="a">', { kind: "loading" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("tipPosition", () => {
  const size = { width: 100, height: 40 };
  const anchor = { left: 200, top: 300, bottom: 360, width: 60 };
  it("centered above the card", () => {
    expect(tipPosition(anchor, size, 1000)).toEqual({ left: 180, top: 252 });
  });
  it("below if there is no room above", () => {
    expect(tipPosition({ ...anchor, top: 20, bottom: 80 }, size, 1000).top).toBe(88);
  });
  it("stays on screen on the left and right", () => {
    expect(tipPosition({ ...anchor, left: 0, width: 10 }, size, 1000).left).toBe(8);
    expect(tipPosition({ ...anchor, left: 990, width: 10 }, size, 1000).left).toBe(892);
  });
});
