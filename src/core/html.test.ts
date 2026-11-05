import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it('échappe & < > "', () => {
    expect(escapeHtml(`<img src="x" onerror='a&b'>`)).toBe("&lt;img src=&quot;x&quot; onerror='a&amp;b'&gt;");
  });
  it("laisse un texte simple intact", () => {
    expect(escapeHtml("Saber 100")).toBe("Saber 100");
  });
  it("gère la chaîne vide", () => {
    expect(escapeHtml("")).toBe("");
  });
});
