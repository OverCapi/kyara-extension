# Plan de migration vers WXT + TypeScript

Objectif : réécrire l'extension avec la stack décrite dans [CLAUDE.md](CLAUDE.md), **sans perdre ni modifier aucune fonctionnalité**. L'utilisateur ne doit voir aucune différence, sauf qu'il n'y a plus de logs en prod.

Ce fichier est supprimé à la fin de la migration (phase 8).

---

## 0. Inventaire : ce qui doit marcher à l'identique

Cette liste sert de checklist finale (phase 7). Chaque ligne correspond à un comportement actuel.

### Cache passif (`background.js`)
- [ ] B1. Lit sans les modifier les réponses GET de `/api/market/listings*`, `/api/market/prices/*`, `/api/characters/*`, `/api/fair-play/prices*` et `/api/me/collection*`. La page reçoit toujours la réponse intacte.
- [ ] B2. Tout objet `{ characterId, median7d, … }` trouvé dans la réponse, à n'importe quelle profondeur, est stocké en `p:<id>` = `{ m7, m30, s7, last, t }`.
- [ ] B3. Une réponse fair-play `{ "<id>": prix }` est stockée en `f:<id>` = `{ v, t }`. Seuls les nombres sont gardés.
- [ ] B4. La collection est stockée en `owned` = `{ <id>: qty }`, seulement les `qty > 0`. Une réponse d'erreur (`{ error }`) n'écrit rien.

### Badges de valeur (onglet Échanges, offres `li[id^="offre-"]`)
- [ ] C1. Carte proposée : badge `≈ G◆`, ou `?` si la valeur est inconnue.
- [ ] C2. Cartes demandées : badge `G − W` signé (`+3`, `-2`, `0`), vert si positif, rouge si négatif. `W◆` ou `?` si une des deux valeurs manque.
- [ ] C3. Valeur d'une carte : prix fair-play `f:` d'abord, sinon médiane `m7`, puis `m30`, puis `last`.
- [ ] C4. Aucun nœud ajouté dans le DOM du site : seulement des attributs `data-kv`, `data-kv-sign`, affichés en CSS.

### Requêtes fair-play à la demande
- [ ] F1. Seulement pour les offres acceptables (je possède au moins une carte demandée), et seulement pour la carte proposée + mes cartes demandées.
- [ ] F2. Une requête groupée `/api/fair-play/prices?ids=…`, 200 ids max par requête.
- [ ] F3. Un prix est redemandé après 1 h (TTL). Un id en échec n'est pas réessayé avant 5 min.
- [ ] F4. Une seule requête à la fois. Celle qui arrive pendant une requête en cours est reportée et relancée à la fin.
- [ ] F5. Aucune requête quand l'onglet est caché. Relance quand il redevient visible.
- [ ] F6. Les requêtes partent avec `content.fetch` (mêmes cookies que la page), et avec les en-têtes `authorization: Bearer <kyara_token>` et `x-device-id: <kyara_device>` lus dans le `localStorage` du site.
- [ ] F7. Si `owned` est absent du stockage, une seule requête `/me/collection?lean=1` par page.

### Teinte de rentabilité
- [ ] T1. Le fond de l'offre est teinté selon le meilleur gain relatif `(G − W) / max(W, 1)` parmi **mes** cartes demandées. Bleu `rgba(90,190,255,a)` si gain, rouge `rgba(230,60,60,a)` si perte, avec `a = 0.45 × |t|` et `t` borné à ±1. Transparent si inconnu.
- [ ] T2. Pastille « Rentabilité on/off » en bas à gauche, visible seulement s'il y a des offres sur la page. `aria-pressed` reflète l'état.
- [ ] T3. Le choix est mémorisé dans le stockage (`noTint`) et synchronisé entre onglets. En mode off, plus de fond (badges et anneaux restent).

### Anneau de rareté
- [ ] R1. La couleur est lue dans le `box-shadow` inline de l'image de la carte. Elle est appliquée en `outline` 2px via `--kv-rar` et `data-kv-rar`.
- [ ] R2. L'écart entre les vignettes `.thumbs` passe à 12px.

### Infobulle « Min marché »
- [ ] M1. Après 250 ms de survol d'une carte d'offre, une infobulle affiche le nom de la carte et « … » pendant le chargement.
- [ ] M2. Requête `/market/listings?characterId=<id>&type=fixed&sort=price_asc&pageSize=1`. Elle affiche `<min>◆` et « N annonce(s) », ou « aucune annonce », ou « indisponible » en cas d'erreur.
- [ ] M3. Le résultat est gardé 2 min par carte.
- [ ] M4. L'infobulle est placée au-dessus de la carte, en dessous s'il n'y a pas la place, et toujours dans l'écran (marge 8px). Elle se cache au scroll ou quand la souris quitte la carte.
- [ ] M5. Le nom de la carte est échappé (pas d'injection HTML).

### Général
- [ ] G1. Rendu déclenché par les changements du DOM, du stockage et de la visibilité, avec un debounce de 300 ms.
- [ ] G2. Manifest : Firefox MV2, id `kyara-extension@local`, Firefox ≥ 115. Mêmes permissions (`webRequest`, `webRequestBlocking`, `storage`, `https://kyara.games/*`).
- [ ] G3. Même apparence : toutes les règles de `content.css` sont reprises, avec les variables CSS du site.

---

## 1. Correspondance ancien → nouveau

| Ancien | Nouveau |
|---|---|
| `manifest.json` | `wxt.config.ts` (le manifest est généré) |
| `background.js` : `extractPrices`, `extractFair`, `extractOwned`, `parse` | `src/kyara/parse.ts` |
| `background.js` : écouteur `webRequest` | `src/entrypoints/background.ts` + `src/kyara/passive-cache.ts` |
| `content.js` : `api`, `pageFetch` | `src/kyara/api.ts` |
| `content.js` : `OFFER`, `idOf`, `cards` | `src/kyara/dom.ts` |
| `content.js` : `value` | `src/kyara/prices.ts` |
| `content.js` : `loadOwned` | `src/kyara/collection.ts` (réutilise `parse.ts`) |
| `content.js` : `fetchFair`, `tried`, `inflight`, TTL/RETRY | `src/kyara/fair-play.ts` (réutilise `parse.ts`) |
| `content.js` : `render`, `schedule`, observers | `src/core/page.ts` (observer + debounce) + `src/kyara/offers.ts` (instantané des offres) |
| `content.js` : `paint` (badges) | `src/features/trade-badges/` |
| `content.js` : `tint`, pastille, `applyTint` | `src/features/profit-tint/` |
| `content.js` : `rarityRing` | `src/features/rarity-ring/` |
| `content.js` : infobulle, `marketMin`, `showTip` | `src/features/market-tooltip/` |
| `content.js` : `esc` | `src/core/html.ts` |
| `content.js` / `background.js` : `log` | `src/core/log.ts` (dev uniquement) |
| `content.css` | Découpé : un `style.css` par feature |
| `test.mjs` | `*.test.ts` à côté de chaque module (ses cas sont repris dans `parse.test.ts`) |

**Nouveaux fichiers par rapport à l'arbre de CLAUDE.md** : `kyara/collection.ts`, `kyara/fair-play.ts`, `kyara/offers.ts` et `kyara/passive-cache.ts`. L'arbre de CLAUDE.md sera mis à jour en phase 8.

### Le rendu partagé : `kyara/offers.ts`

Aujourd'hui, une seule fonction `render` lit les offres, lit le stockage, puis peint les badges, la teinte et les anneaux. Pour séparer les features sans perdre en performance (règle « une seule lecture du stockage par rendu ») :

1. `core/page.ts` déclenche un rendu (debounce de 300 ms) à chaque changement du DOM, du stockage ou de la visibilité.
2. `kyara/offers.ts` construit **une fois** un instantané : liste des offres (éléments + ids des cartes), valeurs connues, cartes possédées.
3. Chaque feature reçoit cet instantané via `ctx.onOffers(snapshot => …)` et ne fait que peindre.
4. `kyara/fair-play.ts` reçoit le même instantané et demande les prix manquants (règles F1 à F5).

---

## 2. Phases

Chaque phase se termine par : `pnpm check` et `pnpm test` verts, sans warning, puis un commit. L'ancien code reste en place jusqu'à la phase 8, comme référence.

Travail sur une branche `migration-wxt`.

### Phase 1 : squelette WXT
1. `pnpm init`, puis installer `wxt`, `typescript`, `vitest`, `@vitest/coverage-v8`, `happy-dom` et `@biomejs/biome` (tous en devDependencies).
2. `wxt.config.ts` :
   - `srcDir: "src"` et cible Firefox par défaut (`browser: "firefox"`, `manifestVersion: 2`) ;
   - manifest : nom, description, version `0.1.0`, permissions G2 et `browser_specific_settings.gecko`.
3. Scripts `package.json` : `dev`, `build`, `zip`, `test`, `test:coverage` et `check` (`biome check && wxt prepare && tsc --noEmit`).
4. `tsconfig.json` étend `.wxt/tsconfig.json`, avec `strict: true` et `noUncheckedIndexedAccess: true`.
5. `biome.json` : `noConsole` (sauf `core/log.ts`), `noFloatingPromises`, `noExplicitAny`.
6. `vitest.config.ts` : plugin `WxtVitest`, environnement `happy-dom`, seuils de couverture de CLAUDE.md §7.
7. Ajouter `.output/` et `.wxt/` au `.gitignore`.
8. Créer des entrypoints vides `background.ts` et `content.ts`.

**Vérification** : `pnpm dev` ouvre Firefox avec l'extension chargée, sans erreur ni warning. Le manifest généré (`.output/firefox-mv2/manifest.json`) est équivalent à l'ancien.

**À vérifier pendant cette phase** : les types de WXT ne couvrent peut-être pas `browser.webRequest.filterResponseData` ni `content.fetch`, qui n'existent que sur Firefox. Si c'est le cas, ajouter une déclaration de types minimale `src/core/firefox.d.ts`, limitée aux membres utilisés.

### Phase 2 : `core/` (outils génériques)
- `log.ts` : `log.debug` / `log.error`, actifs seulement si `import.meta.env.DEV`. Préfixe `[kyara-extension:<module>]`.
- `errors.ts` : `safe(fn)` et `safeAsync(fn)`, qui attrapent les erreurs et les loguent en dev.
- `storage.ts` : clés typées. **On garde exactement les mêmes clés** (`p:<id>`, `f:<id>`, `owned`, `noTint`) pour que le cache déjà rempli reste valide après la mise à jour. Fonctions : `getPrices(ids)` (une seule lecture), `setMany(...)`, `onChange(...)`, `isFresh(entry, ttl)`.
- `page.ts` : un seul `MutationObserver` sur `document.body`, plus `storage.onChanged` et `visibilitychange`, avec un debounce de 300 ms. Aussi `mountFloating(el)` pour ajouter un élément à `<html>`. Tout est nettoyé via `ctx.onInvalidated`.
- `html.ts` : `escapeHtml`.

**Tests** : chaque module. Le debounce est testé avec `vi.useFakeTimers()`. `safe` est testé avec des fonctions qui lèvent une erreur, de façon synchrone et asynchrone. `log` est testé muet quand `DEV = false`.

### Phase 3 : `kyara/` (connaissance du site)
- `parse.ts` : `parseResponse(url, json: unknown)`, `parsePrices`, `parseFairPrices` et `parseCollection`. Ces fonctions valident la forme de la donnée et ne lèvent jamais d'exception. **Ce sont les seules fonctions qui lisent ces formats**, utilisées à la fois par le background et le content script (cela supprime les doublons B3/F2 et B4/F7).
- `api.ts` : `kyaraFetch(path)`. Utilise `content.fetch` si disponible, sinon `fetch`, avec les en-têtes F6. Ne lève jamais d'exception : renvoie `{ ok, status, data }`.
- `dom.ts` : sélecteur `OFFER_SELECTOR`, `cardId(a)` et `readOffer(li)` → `{ give, wants, ids }`.
- `prices.ts` : `cardValue(store, id)` (règle C3).
- `collection.ts` : `loadOwned()` (règle F7).
- `fair-play.ts` : `requestMissing(snapshot)` (règles F1 à F5) : lots de 200, TTL 1 h, délai de réessai 5 min, une requête à la fois, report si l'onglet est caché.
- `offers.ts` : construit l'instantané partagé (voir §1).
- `passive-cache.ts` : branche `filterResponseData` (règle B1). La réponse est **toujours** transmise intacte, même si l'analyse échoue.

**Tests** : tous les cas de `test.mjs`, plus les JSON invalides, les réponses HTTP 401/429/500, un `fetch` rejeté, plus de 200 ids, le TTL expiré ou non, un réessai trop tôt, l'onglet caché, et un faux HTML d'offre pour `dom.ts`.

### Phase 4 : background
`entrypoints/background.ts` : `defineBackground(() => startPassiveCache())`. Rien d'autre.

**Vérification** : dans Firefox, après avoir parcouru le marché, `about:debugging` → Inspecter → Stockage : les clés `p:`, `f:` et `owned` sont remplies comme avant (B1 à B4).

### Phase 5 : features (une par une, un commit par feature)
Pour chacune : `index.ts` exporte un objet `Feature`, avec son `style.css` et ses tests sur un faux DOM d'offre.

1. `rarity-ring` (R1, R2) : la plus simple, elle valide le mécanisme `Feature`.
2. `trade-badges` (C1 à C4).
3. `profit-tint` (T1 à T3) : la fonction `tintColor(ratio)` est testée aux bornes (−1, 0, +1, au-delà, `null`).
4. `market-tooltip` (M1 à M5) : délai, cache de 2 min, positionnement aux bords de l'écran, échappement du nom.

### Phase 6 : content script
- `features/index.ts` : `export const features = [rarityRing, tradeBadges, profitTint, marketTooltip]`.
- `entrypoints/content.ts` : `defineContentScript({ matches: ["https://kyara.games/*"], main(ctx) })`. Crée le contexte, démarre chaque feature dans `safe()`, et branche `fair-play.ts` sur les rendus.

### Phase 7 : vérification complète
1. `pnpm test:coverage` : seuils atteints.
2. `pnpm check` et `pnpm build` : zéro warning.
3. **Checklist §0 cochée à la main** dans Firefox, sur kyara.games → Marché → Échanges, connecté avec des offres acceptables : badges, couleurs, pastille on/off (avec rechargement de la page et 2 onglets), anneaux, infobulle (carte avec et sans annonce), onglet caché puis ré-affiché.
4. Build de prod : la console de la page et celle du background sont **vides**. Aucun `[kyara-extension` dans `.output/` (vérifier avec `grep -r "kyara-extension:" .output/`).
5. Réseau (F12 → Réseau) : mêmes requêtes qu'avec l'ancienne version, pas plus.
6. Rechargement de l'extension avec la page ouverte : aucune erreur « Extension context invalidated ».
7. Taille du content script dans `.output/` : du même ordre que l'ancien `content.js` (~10 Ko non minifié).

### Phase 8 : nettoyage
1. Supprimer `manifest.json`, `background.js`, `content.js`, `content.css` et `test.mjs`.
2. Mettre à jour `README.md` : installation via `pnpm build` puis chargement de `.output/firefox-mv2/manifest.json`, et commandes de dev.
3. Mettre à jour l'arbre de fichiers dans `CLAUDE.md` (nouveaux modules de `kyara/`).
4. Supprimer ce fichier `MIGRATION.md`.
5. Merger `migration-wxt` dans `main`.

---

## 3. Risques

| Risque | Parade |
|---|---|
| Types Firefox (`filterResponseData`, `content.fetch`) absents de WXT | Déclaration `.d.ts` minimale (phase 1) |
| Le CSS injecté par WXT ne s'applique pas dans le même ordre que l'ancien `content.css` | Les règles qui doivent primer gardent leur `!important`. Comparer visuellement en phase 7. |
| Changement de clés de stockage, cache perdu | Clés identiques imposées (phase 2) |
| Une feature séparée relit le stockage, double coût | Instantané partagé `offers.ts`, une seule lecture par rendu |
| Comportement temporel (TTL, délais) cassé sans qu'on le voie | Tests avec horloge simulée (`vi.useFakeTimers`) |
