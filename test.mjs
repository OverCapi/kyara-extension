// node test.mjs : vérifie le tri des réponses API vers le cache.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert";

const noop = { addListener() {} };
const ctx = {
  browser: {
    webRequest: { onBeforeRequest: noop },
  },
  Date, URL, console: { log() {} },
};
vm.runInNewContext(readFileSync(new URL("./background.js", import.meta.url), "utf8"), ctx);
const K = "https://kyara.games";

// Listings : médianes
const listing = {
  items: [
    { character: { id: 1 }, prices: { characterId: 1, median7d: 18, median30d: 19, sales7d: 400, lastPrice: 15 } },
    { character: { id: 2 }, prices: { characterId: 2, median7d: null, median30d: 7, sales7d: 0, lastPrice: 5 } },
  ],
};
let out = ctx.parse(K + "/api/market/listings?page=1", listing);
assert.deepStrictEqual(Object.keys(out).sort(), ["p:1", "p:2"]);
assert.strictEqual(out["p:2"].m30, 7);

// Fair-play : { id: prix }
out = ctx.parse(K + "/api/fair-play/prices?ids=1,2,3", { 1: 12, 2: 0, 3: null });
assert.deepStrictEqual(Object.keys(out).sort(), ["f:1", "f:2"]);
assert.strictEqual(out["f:1"].v, 12);

// Collection : seules les qty > 0
out = ctx.parse(K + "/api/me/collection?lean=1", [
  { characterId: 10, qty: 2 },
  { characterId: 11, qty: 0 },
]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(out)), { owned: { 10: 2 } });

// Erreur API (non connecté) : rien
assert.deepStrictEqual(Object.keys(ctx.parse(K + "/api/me/collection?lean=1", { error: "unauthorized" })), []);
console.log("ok");
