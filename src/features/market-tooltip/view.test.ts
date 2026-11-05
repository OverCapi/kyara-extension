import { describe, expect, it } from "vitest";
import { tipHtml, tipPosition } from "./view";

describe("tipHtml", () => {
  it("chargement", () => {
    expect(tipHtml("Saber", { kind: "loading" })).toContain("…");
  });
  it("indisponible", () => {
    expect(tipHtml("Saber", { kind: "error" })).toContain("indisponible");
  });
  it("aucune annonce", () => {
    expect(tipHtml("Saber", { kind: "result", data: { min: null, count: 0 } })).toContain("aucune annonce");
  });
  it("prix et pluriel", () => {
    const one = tipHtml("S", { kind: "result", data: { min: 7, count: 1 } });
    const many = tipHtml("S", { kind: "result", data: { min: 7, count: 3 } });
    expect(one).toContain("7<i>◆</i>");
    expect(one).toContain("1 annonce<");
    expect(many).toContain("3 annonces<");
  });
  it("échappe le nom venu du site", () => {
    const html = tipHtml('<img src=x onerror="a">', { kind: "loading" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("tipPosition", () => {
  const size = { width: 100, height: 40 };
  const anchor = { left: 200, top: 300, bottom: 360, width: 60 };
  it("centrée au-dessus de la carte", () => {
    expect(tipPosition(anchor, size, 1000)).toEqual({ left: 180, top: 252 });
  });
  it("en dessous s'il n'y a pas la place au-dessus", () => {
    expect(tipPosition({ ...anchor, top: 20, bottom: 80 }, size, 1000).top).toBe(88);
  });
  it("reste dans l'écran à gauche et à droite", () => {
    expect(tipPosition({ ...anchor, left: 0, width: 10 }, size, 1000).left).toBe(8);
    expect(tipPosition({ ...anchor, left: 990, width: 10 }, size, 1000).left).toBe(892);
  });
});
