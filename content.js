// Onglet Échanges : badge de valeur sur chaque carte.
// Carte donnée : "≈ G◆". Cartes demandées : G - W (ce que tu gagnes si tu donnes W pour recevoir G).
// N'ajoute aucun noeud dans le DOM du site : seulement des attributs data-kv, affichés en CSS.
//
// Requêtes : UNE requête groupée /api/fair-play/prices?ids=… (max 200 ids, comme le site),
// seulement pour les offres que tu peux accepter (tu possèdes au moins une carte demandée),
// et seulement pour la carte proposée + tes cartes demandées. Le reste vient du cache passif.
// Logs dans la console de la page (F12), préfixe [kyara-extension].

const log = (...a) => console.log("[kyara-extension]", ...a);
const OFFER = 'li[id^="offre-"]';
const TTL = 60 * 60 * 1000; // prix re-demandé après 1 h
const RETRY = 5 * 60 * 1000; // id en échec : pas de nouvel essai avant 5 min
const BATCH = 200;
// content.fetch (Firefox) = requête faite comme la page : même origine, mêmes cookies.
const pageFetch = typeof content !== "undefined" && content.fetch ? content.fetch.bind(content) : fetch;

// Mêmes headers que le site (son wrapper d'API) : jeton et device id lus dans le localStorage de kyara.games.
// Le jeton ne quitte jamais kyara.games : il n'est envoyé qu'à /api du même site.
function api(path) {
  const headers = {};
  try {
    const token = localStorage.getItem("kyara_token");
    const device = localStorage.getItem("kyara_device");
    if (token) headers.authorization = `Bearer ${token}`;
    if (device) headers["x-device-id"] = device;
  } catch {}
  return pageFetch("/api" + path, { headers });
}

const idOf = (a) => Number(a.getAttribute("href").split("/").pop());

function cards(li) {
  const give = li.querySelector('.give a[href^="/wiki/"]');
  const wants = [...li.querySelectorAll('.want a[href^="/wiki/"]')];
  return { give, wants, ids: [give, ...wants].filter(Boolean).map(idOf) };
}

// Prix fair-play du site d'abord, sinon médiane marché du cache passif.
function value(store, id) {
  const f = store["f:" + id];
  if (f) return f.v;
  const p = store["p:" + id];
  return p ? p.m7 ?? p.m30 ?? p.last ?? null : null;
}

function paint(li, store) {
  const { give, wants } = cards(li);
  if (!give) return;
  for (const a of [give, ...wants]) rarityRing(a);
  const g = value(store, idOf(give));
  give.dataset.kv = g == null ? "?" : `≈ ${g}◆`;
  let best = null; // meilleur gain relatif parmi MES cartes demandées
  for (const a of wants) {
    const w = value(store, idOf(a));
    if (g == null || w == null) {
      a.dataset.kv = w == null ? "?" : `${w}◆`;
      a.dataset.kvSign = "0";
    } else {
      const d = g - w;
      a.dataset.kv = (d > 0 ? "+" : "") + d;
      a.dataset.kvSign = Math.sign(d);
      if (owned?.[idOf(a)] > 0) best = Math.max(best ?? -Infinity, d / Math.max(w, 1));
    }
  }
  li.style.setProperty("--kv-bg", tint(best));
}

// Le site met déjà la couleur officielle de rareté (--C/--U/--R/--E/--L/--M) dans le box-shadow inline
// de chaque image ; on la reprend pour l'anneau extérieur (le site le met toujours en vert --U).
function rarityRing(a) {
  const color = a.querySelector("img")?.style.boxShadow.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i)?.[0];
  if (!color) return;
  a.style.setProperty("--kv-rar", color);
  a.dataset.kvRar = "";
}

// Gain relatif → couleur : +100 % ou plus = bleu clair plein, 0 = neutre, -100 % = rouge plein.
// ponytail: seuil fixe à ±100 %, à exposer en option si l'échelle ne convient pas.
function tint(r) {
  if (r == null) return "transparent";
  const t = Math.max(-1, Math.min(1, r));
  const a = (0.45 * Math.abs(t)).toFixed(2);
  return t >= 0 ? `rgba(90, 190, 255, ${a})` : `rgba(230, 60, 60, ${a})`;
}

let owned = null; // { id: qty }, null = pas encore connu
let collectionAsked = false;
const tried = new Map(); // id -> date du dernier essai
let inflight = false;

async function loadOwned() {
  ({ owned = null } = await browser.storage.local.get("owned"));
  if (owned || collectionAsked) return;
  // Le site charge la collection au démarrage ; si on l'a ratée (extension chargée après), une seule requête.
  collectionAsked = true;
  const r = await api("/me/collection?lean=1");
  log(`collection: HTTP ${r.status}`);
  if (!r.ok) return;
  owned = {};
  for (const c of await r.json()) if (c.qty > 0) owned[c.characterId] = c.qty;
  await browser.storage.local.set({ owned });
}

async function fetchFair(ids) {
  inflight = true;
  try {
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      chunk.forEach((id) => tried.set(id, Date.now()));
      const r = await api(`/fair-play/prices?ids=${chunk.join(",")}`);
      log(`fair-play: ${chunk.length} ids → HTTP ${r.status}`);
      if (!r.ok) continue;
      const out = {};
      for (const [id, v] of Object.entries(await r.json())) if (typeof v === "number") out["f:" + id] = { v, t: Date.now() };
      await browser.storage.local.set(out);
    }
  } catch (err) {
    log("fair-play: erreur", err);
  }
  inflight = false;
  schedule(); // la liste a pu changer pendant la requête (ex. filtre "Que je peux accepter")
}

let timer;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(render, 300);
}

async function render() {
  const lis = [...document.querySelectorAll(OFFER)];
  if (!lis.length) return;
  await loadOwned();
  const all = lis.map(cards);
  const ids = [...new Set(all.flatMap((c) => c.ids))];
  const store = await browser.storage.local.get(ids.flatMap((id) => ["f:" + id, "p:" + id]));
  lis.forEach((li) => paint(li, store));

  // Offres acceptables : je possède au moins une carte demandée.
  const need = new Set();
  let acceptable = 0;
  for (const c of all) {
    if (!c.give || !owned) continue;
    const mine = c.wants.map(idOf).filter((id) => owned[id] > 0);
    if (!mine.length) continue;
    acceptable++;
    for (const id of [idOf(c.give), ...mine]) {
      const f = store["f:" + id];
      const stale = !f || Date.now() - f.t > TTL;
      if (stale && Date.now() - (tried.get(id) || 0) > RETRY) need.add(id);
    }
  }
  log(`render: ${lis.length} offres, ${acceptable} acceptables, ${need.size} prix à demander` + (owned ? "" : " (collection inconnue)"));
  if (!need.size) return;
  if (inflight) return log("fetch reporté : requête en cours"); // relancé à la fin de fetchFair
  if (document.visibilityState !== "visible") return log("fetch reporté : onglet caché"); // relancé par visibilitychange
  fetchFair([...need]);
}

new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
browser.storage.onChanged.addListener(schedule);
document.addEventListener("visibilitychange", schedule);

// Fond coloré de rentabilité on/off : petite pastille fixe, visible seulement quand il y a des offres.
// Ajoutée à <html>, hors de l'arbre géré par le site. Choix mémorisé dans storage ("noTint").
const toggle = document.createElement("button");
toggle.type = "button";
toggle.className = "kv-toggle";
toggle.title = "Kyara Extension : couleurs de rentabilité";
toggle.hidden = true;
document.documentElement.append(toggle);
toggle.addEventListener("click", () => {
  browser.storage.local.set({ noTint: !document.documentElement.classList.contains("kv-no-tint") });
});
function applyTint(noTint) {
  document.documentElement.classList.toggle("kv-no-tint", noTint);
  toggle.textContent = `Rentabilité ${noTint ? "off" : "on"}`;
  toggle.setAttribute("aria-pressed", String(!noTint));
}
browser.storage.local.get("noTint").then(({ noTint = false }) => applyTint(noTint));
browser.storage.onChanged.addListener((ch) => "noTint" in ch && applyTint(ch.noTint.newValue));
new MutationObserver(() => (toggle.hidden = !document.querySelector(OFFER))).observe(document.body, {
  childList: true,
  subtree: true,
});
schedule();
log("chargé sur", location.href);

// --- Box au survol d'une carte : prix min actuel sur le marché (annonces à prix fixe) ---
// Une requête par carte survolée (après 250 ms sur la carte), résultat gardé 2 min.
// La box est un seul élément ajouté à <html>, hors de l'arbre géré par le site.
const TIP_DELAY = 250;
const TIP_TTL = 2 * 60 * 1000;
const minCache = new Map(); // id -> { min, count, t }
const tip = document.createElement("div");
tip.className = "kv-tip";
tip.hidden = true;
document.documentElement.append(tip);
let tipFor = null;
let tipTimer;

async function marketMin(id) {
  const c = minCache.get(id);
  if (c && Date.now() - c.t < TIP_TTL) return c;
  const r = await api(`/market/listings?characterId=${id}&type=fixed&sort=price_asc&pageSize=1`);
  log(`min marché ${id}: HTTP ${r.status}`);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json();
  const it = j.items?.[0];
  const res = { min: it ? it.price : null, count: j.total ?? 0, t: Date.now() };
  minCache.set(id, res);
  return res;
}

function showTip(a, html) {
  tip.innerHTML = html;
  tip.hidden = false;
  const r = a.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  const top = r.top - h - 8 >= 8 ? r.top - h - 8 : r.bottom + 8;
  tip.style.left = left + "px";
  tip.style.top = top + "px";
}

document.addEventListener("mouseover", (e) => {
  const a = e.target.closest?.(`${OFFER} a[href^="/wiki/"]`);
  if (a === tipFor) return;
  tipFor = a;
  clearTimeout(tipTimer);
  tip.hidden = true;
  if (!a) return;
  const id = idOf(a);
  const name = a.getAttribute("title") || "";
  tipTimer = setTimeout(async () => {
    showTip(a, `<b>${esc(name)}</b><span class="kv-row"><span>Min marché</span><span class="kv-v">…</span></span>`);
    let body;
    try {
      const { min, count } = await marketMin(id);
      body =
        min == null
          ? `<span class="kv-row"><span>Min marché</span><span class="kv-v kv-mut">aucune annonce</span></span>`
          : `<span class="kv-row"><span>Min marché</span><span class="kv-v">${min}<i>◆</i></span></span>` +
            `<span class="kv-sub">${count} annonce${count > 1 ? "s" : ""}</span>`;
    } catch {
      body = `<span class="kv-row"><span>Min marché</span><span class="kv-v kv-mut">indisponible</span></span>`;
    }
    if (tipFor === a) showTip(a, `<b>${esc(name)}</b>${body}`);
  }, TIP_DELAY);
});
window.addEventListener("scroll", () => { tipFor = null; tip.hidden = true; }, { passive: true });

function esc(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
