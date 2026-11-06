import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it('escapes & < > "', () => {
    expect(escapeHtml(`<img src="x" onerror='a&b'>`)).toBe("&lt;img src=&quot;x&quot; onerror='a&amp;b'&gt;");
  });
  it("leaves plain text untouched", () => {
    expect(escapeHtml("Saber 100")).toBe("Saber 100");
  });
  it("handles the empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});
