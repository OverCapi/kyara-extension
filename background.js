// Cache passif Kyara : lit les réponses JSON que le site charge déjà (aucune requête en plus)
// et les range dans storage.local :
//   "p:<id>" = médianes marché   (listings, wiki, prices/<id>)
//   "f:<id>" = prix fair-play    (/api/fair-play/prices?ids=…, ce que le site utilise pour les échanges)
//   "owned"  = { <id>: qty }     (/api/me/collection?lean=1)
// Logs dans about:debugging > Kyara Extension > Inspecter.

const log = (...a) => console.log("[kyara-extension bg]", ...a);

// Trouve tout objet { characterId, median7d, ... } dans une réponse JSON.
function extractPrices(obj, out = {}) {
  if (Array.isArray(obj)) {
    for (const x of obj) extractPrices(x, out);
  } else if (obj && typeof obj === "object") {
    if (typeof obj.characterId === "number" && "median7d" in obj) {
      out["p:" + obj.characterId] = {
        m7: obj.median7d,
        m30: obj.median30d,
        s7: obj.sales7d,
        last: obj.lastPrice,
        t: Date.now(),
      };
    }
    for (const v of Object.values(obj)) extractPrices(v, out);
  }
  return out;
}

// Réponse fair-play : { "<id>": prix }.
function extractFair(obj) {
  const out = {};
  for (const [id, v] of Object.entries(obj || {})) {
    if (typeof v === "number") out["f:" + id] = { v, t: Date.now() };
  }
  return out;
}

// Collection : [{ characterId, qty, ... }].
function extractOwned(arr) {
  if (!Array.isArray(arr)) return {};
  const owned = {};
  for (const c of arr) if (c && c.qty > 0) owned[c.characterId] = c.qty;
  return { owned };
}

function parse(url, json) {
  const path = new URL(url).pathname;
  if (path === "/api/me/collection") return extractOwned(json);
  if (path === "/api/fair-play/prices") return extractFair(json);
  return extractPrices(json);
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method !== "GET") return;
    const filter = browser.webRequest.filterResponseData(details.requestId);
    const decoder = new TextDecoder();
    let text = "";
    filter.ondata = (e) => {
      text += decoder.decode(e.data, { stream: true });
      filter.write(e.data); // la page reçoit la réponse intacte
    };
    filter.onstop = async () => {
      filter.close();
      try {
        const found = parse(details.url, JSON.parse(text + decoder.decode()));
        const keys = Object.keys(found);
        log(details.url, "→", keys[0] === "owned" ? `${Object.keys(found.owned).length} cartes possédées` : `${keys.length} prix`);
        if (keys.length) await browser.storage.local.set(found);
      } catch (err) {
        log("parse KO", details.url, err.message, text.slice(0, 120));
      }
    };
    filter.onerror = () => log("filter KO", details.url, filter.error);
  },
  {
    urls: [
      "https://kyara.games/api/market/listings*",
      "https://kyara.games/api/market/prices/*",
      "https://kyara.games/api/characters/*",
      "https://kyara.games/api/fair-play/prices*",
      "https://kyara.games/api/me/collection*",
    ],
  },
  ["blocking"]
);

log("chargé");
