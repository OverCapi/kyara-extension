# Kyara Extension : règles du projet

Ce fichier sert de référence pour toute modification du projet. Claude Code le lit automatiquement à chaque session.

---

## 1. Stack technique

| Rôle | Outil | Pourquoi |
|---|---|---|
| Framework d'extension | **WXT** | Basé sur Vite. Build rapide et rechargement auto en dev. Génère le `manifest.json`. Gère Firefox et Chrome. Ne laisse quasi aucun code à lui dans l'extension finale. |
| Langage | **TypeScript** (`strict: true`) | Les erreurs sont détectées avant l'exécution, et l'autocomplétion couvre l'API `browser`. Le code compilé est du JS normal : aucun coût à l'exécution. |
| UI | **Aucun framework** (DOM + CSS natifs) | L'extension ne dessine que des badges, une pastille et une infobulle. React ou Vue ajouteraient 40 à 100 Ko chargés sur chaque page, sans rien apporter ici. Si un popup ou une page d'options complexe apparaît un jour, utiliser **Svelte** : il compile en JS natif sans runtime. |
| Tests | **Vitest** + `WxtVitest` + `fakeBrowser` | Intégré à WXT. `fakeBrowser` simule `browser.storage` en mémoire, donc rien à mocker à la main. |
| Lint + format | **Biome** | Remplace ESLint et Prettier en un seul outil, 10 à 100 fois plus rapide. |
| Gestionnaire de paquets | **pnpm** | Rapide, économe en disque, recommandé par la doc WXT. |

### Firefox complet, Chrome partiel

L'extension lit les réponses de l'API Kyara avec `webRequest.filterResponseData` (mode `blocking`), et fait ses requêtes avec `content.fetch`. **Ces deux API n'existent que sur Firefox**, en Manifest V2.

- Firefox : `pnpm build`, en MV2. Tout fonctionne.
- Chrome : `pnpm build:chrome`, en MV3. Le cache passif est coupé (`import.meta.env.FIREFOX` dans `background.ts`), et `pageFetch` retombe sur le `fetch` normal. Les prix viennent seulement des requêtes fair-play et de la collection : plus de `?` que sur Firefox.
- Pour un cache passif sur Chrome : un script injecté dans la page (`world: "MAIN"`) qui intercepte `fetch` et transmet les réponses au content script. WXT gère ce cas, mais c'est un vrai chantier : ne pas le faire sans besoin.

### Alternatives écartées

- **Plasmo** : orienté React, plus lourd, moins maintenu que WXT.
- **CRXJS** : centré sur Chrome, support Firefox faible.
- **JS natif + esbuild** : le plus léger possible, mais il faudrait réécrire à la main ce que WXT donne déjà (manifest, rechargement auto, zip, multi-navigateurs).

**Verdict : WXT + TypeScript convient très bien.** Les performances dans le navigateur sont les mêmes qu'avec du JS natif.

---

## 2. Organisation des fichiers

Règle : **aucun dossier ne dépasse ~8 fichiers**. Au-delà, on crée un sous-dossier.

```
kyara-extension/
├── wxt.config.ts            # Config WXT : srcDir, permissions, cible Firefox
├── vitest.config.ts
├── biome.json
├── tsconfig.json
├── package.json
└── src/
    ├── entrypoints/         # Points d'entrée UNIQUEMENT : ils branchent, ils ne contiennent pas de logique
    │   ├── background.ts    # Démarre le cache passif
    │   └── content.ts       # Démarre les features de la page
    │
    ├── features/            # Une feature = un dossier. Ce que l'utilisateur voit.
    │   ├── index.ts         # Liste des features actives (la seule ligne à ajouter pour une nouvelle feature)
    │   ├── types.ts         # Contrat Feature / FeatureContext
    │   ├── runtime.ts       # Lance les features, construit l'instantané des offres une fois par rendu
    │   ├── trade-badges/    # Badges "≈ G◆" et "G − W" sur les offres
    │   ├── profit-tint/     # Fond coloré de l'offre + pastille on/off
    │   ├── rarity-ring/     # Anneau couleur de rareté
    │   ├── gain-filter/     # Filtre "Gain min" (Off / Neutre et + / Positif + curseur) et tri par rentabilité
    │   ├── rarity-filter/   # Filtre par rareté de la carte proposée (puces multi-sélection)
    │   ├── load-more/       # Clique « Voir plus d'offres » tant qu'un filtre laisse trop peu d'offres visibles, le bouton affichant « Chargement… » pendant le chargement
    │   └── market-tooltip/  # Infobulle "Min marché" au survol
    │
    ├── kyara/               # Tout ce qui dépend du site kyara.games (si le site change, on modifie ici)
    │   ├── api.ts           # Appels à /api avec le jeton et le device id du site
    │   ├── parse.ts         # Lecture des réponses JSON (prix, fair-play, collection, annonces)
    │   ├── dom.ts           # Sélecteurs CSS du site et lecture des cartes d'une offre
    │   ├── prices.ts        # Valeur d'une carte et analyse de rentabilité d'une offre
    │   ├── collection.ts    # Cartes possédées (stockage, sinon une requête de rattrapage)
    │   ├── rarity.ts        # Raretés : retrouvées d'après la couleur du box-shadow des cartes
    │   ├── filter-panel/    # Bouton "filtre" + fenêtre à 2 sections (Kyara / extension), catégories
    │   ├── offers.ts        # Instantané partagé : offres + prix + cartes possédées
    │   ├── fair-play.ts     # Demande les prix fair-play manquants (lots, TTL, réessais)
    │   └── passive-cache.ts # Lit les réponses de l'API que le site charge déjà (background)
    │
    ├── locales/             # en.json, fr.json : TOUS les textes affichés (voir §6 bis)
    │
    ├── core/                # Outils génériques, sans rien de spécifique à Kyara
    │   ├── i18n.ts          # t() / tn() : lit les textes de locales/*.json selon la langue du navigateur
    │   ├── storage.ts       # Accès typé à browser.storage (clés, types, TTL)
    │   ├── storage-sync.ts  # Écriture d'un réglage + tri des échos de storage.onChanged (curseur, puces)
    │   ├── page.ts          # UN MutationObserver partagé + debounce, éléments flottants ajoutés à <html>
    │   ├── errors.ts        # safe() / safeAsync() : barrière anti-crash
    │   ├── firefox.ts       # API propres à Firefox (filterResponseData, content.fetch)
    │   └── log.ts           # Logs de dev préfixés [kyara-extension:<module>], supprimés du build de prod
    │
    └── test/                # setup.ts (garde-fous communs) et helpers.ts (faux DOM, faux contexte) pour les tests
```

### Qui a le droit d'importer quoi

```
entrypoints  →  features  →  kyara  →  core
```

- Une flèche veut dire « peut importer ». Jamais dans l'autre sens.
- `core/` n'importe rien du projet. `kyara/` n'importe que `core/`.
- **Une feature n'importe jamais une autre feature.** Si deux features ont besoin du même code, ce code descend dans `kyara/` ou `core/`.

### Contenu d'un dossier de feature

```
features/profit-tint/
├── index.ts          # Exporte la feature (voir §3)
├── tint.ts           # Logique pure (calculs), facile à tester
├── tint.test.ts      # Tests à côté du code testé
└── style.css         # CSS de la feature, importé par index.ts
```

Une petite feature peut tenir dans `index.ts` + `style.css`. On découpe quand le fichier dépasse les limites de taille (voir §2 bis).

### 2 bis. Taille des fichiers et des fonctions

| Élément | Limite | Si dépassée |
|---|---|---|
| Fichier | **~150 lignes** (200 max, commentaires compris) | Découper par responsabilité dans le même dossier |
| Fonction | **~30 lignes** (40 max) | Extraire des sous-fonctions nommées |
| Paramètres d'une fonction | **3 max** | Passer un objet `{ ... }` typé |
| Imbrication (`if` / `for` / `try`) | **3 niveaux max** | Retour anticipé (`if (!x) return;`) ou sous-fonction |

Une fonction fait **une seule chose**, et son nom le dit. Si on a besoin du mot « et » pour la décrire, il faut la découper.

---

## 3. Modularité : ajouter une feature

Chaque feature exporte le même format :

```ts
// features/types.ts (ou dans features/index.ts)
export interface Feature {
  /** Nom court, utilisé dans les logs. */
  name: string;
  /** Appelée une fois au chargement de la page. Branche les écouteurs. */
  setup(ctx: FeatureContext): void;
}
```

`FeatureContext` fournit les services partagés : `onOffers(cb)` (appelé à chaque mise à jour de la page avec offres, prix et cartes possédées), `page` (le contexte WXT : `page.onInvalidated` pour tout nettoyer quand l'extension est rechargée) et `filters` (le panneau de filtres : `filters.addCategory(titre, élément)` range les réglages de la feature dans la section « Filtres de l'extension », sous une catégorie).

**Filtres** : une feature qui masque des offres pose son propre attribut (`data-kv-hide-<nom>`) et son propre CSS. Ainsi deux filtres se combinent (une offre est cachée dès qu'un filtre la cache) sans jamais défaire le travail l'un de l'autre.

**Pas de clignotement** : quand le site ajoute des offres (« Voir plus »), elles ne doivent jamais s'afficher avant d'être filtrées / triées. Le runtime pose `data-kv-seen` sur chaque offre une fois les features passées ; un filtre actif pose `data-kv-hold-<nom>` (ou `data-kv-filter-<nom>`) sur `<html>`, et son CSS cache les offres sans `data-kv-seen`. `data-kv-filter-<nom>` signale en plus un vrai filtre à la feature `load-more`, qui charge d'autres offres tant que trop peu restent visibles (minimum, plafond et délai : constantes de `load-more/index.ts`).

**Ajouter une feature = 2 étapes :**
1. Créer `src/features/ma-feature/index.ts` qui exporte un objet `Feature`.
2. Ajouter une ligne dans `src/features/index.ts`.

Aucune autre modification ne doit être nécessaire. Si une feature oblige à modifier une autre feature, l'architecture est à revoir.

---

## 4. Zéro duplication

- **Jamais de code copié-collé.** Si un bout de code sert deux fois, il devient une fonction dans le bon dossier (`kyara/` ou `core/`).
- Points de partage déjà en place, à réutiliser plutôt que recréer :
  - lecture des réponses API (prix, fair-play, collection, annonces) : `kyara/parse.ts`, utilisé par le background et le content script ;
  - surveillance de la page : un seul `MutationObserver`, dans `core/page.ts` ;
  - clés de stockage : `core/storage.ts` uniquement ;
  - calcul de valeur et de gain d'une offre : `kyara/prices.ts`, utilisé par plusieurs features.
- Les constantes (TTL, taille des lots, délais) sont définies une seule fois, en haut du module qui les utilise. Elles sont exportées si un autre module en a besoin.
- Mais : **pas d'abstraction « au cas où ».** On factorise du code qui est vraiment réutilisé, pas du code qui pourrait l'être un jour.

---

## 5. Performance

L'extension tourne sur chaque page de kyara.games. Elle ne doit jamais ralentir le site.

- **Pas de dépendance npm dans le content script** sans raison forte. Vérifier la taille du bundle après chaque `pnpm build`.
- **Un seul `MutationObserver`**, avec debounce (≈300 ms) : on ne recalcule pas à chaque mutation du DOM.
- **Ne jamais ajouter de nœuds dans l'arbre DOM géré par le site.** On pose des attributs `data-kv-*`, et le CSS les affiche. Les éléments flottants (pastille, infobulle) sont ajoutés à `<html>`, hors de l'arbre du site.
  - Seule exception voulue : le bouton du panneau de filtres (`kyara/filter-panel/`), placé dans la barre de filtres du site. Il est réinséré à chaque rendu si le site le retire. Les pastilles d'origine du site sont cachées par CSS (attribut `data-kv-panel` sur la barre) et reflétées dans le panneau : un clic sur la copie clique l'original, rien n'est déplacé.
- **Requêtes réseau minimales** : lire d'abord le cache passif, regrouper les requêtes (max 200 ids, comme le site), ne pas réessayer un id en échec avant un délai, ne rien demander si l'onglet est caché.
- **Lectures de stockage groupées** : un seul `storage.get([...clés])` par rendu, pas un appel par carte.
- Écouteurs `scroll` et `mouseover` : `passive: true`, et le travail coûteux est différé (`setTimeout`).

---

## 5 bis. Gestion des erreurs : l'extension ne plante jamais

Objectif : **zéro crash, zéro erreur, zéro warning** dans la console de la page, celle du background et `about:debugging`. Le site doit toujours fonctionner normalement, même si l'extension échoue.

### Barrières anti-crash

- Chaque feature est démarrée dans `safe()` (`core/errors.ts`). Si une feature plante, l'erreur est attrapée et loguée (en dev), et les autres features continuent.
- Chaque callback asynchrone (écouteur d'événement, `setTimeout`, `MutationObserver`, `storage.onChanged`, `webRequest`) est enveloppé dans `safe()` ou `safeAsync()`. Une erreur dans un callback n'est pas attrapée par le `try` de celui qui l'a enregistré.
- **Aucune promesse orpheline** : chaque promesse est soit attendue (`await`), soit terminée par `.catch()`. La règle Biome `noFloatingPromises` le vérifie.
- Le cache passif (`filterResponseData`) **transmet toujours la réponse intacte à la page**, même si l'analyse échoue : une erreur de l'extension ne doit jamais casser le site.

### Traiter chaque cas d'erreur attendu

| Cas | Comportement |
|---|---|
| Réponse HTTP non OK (401, 429, 500…) | Pas de réessai immédiat, délai avant le prochain essai. Pas de badge (jamais de `?` : valeur inconnue = rien d'affiché). |
| Réseau coupé, `fetch` rejeté | Idem, sans exception non attrapée. |
| JSON invalide ou de forme inattendue | Les fonctions de `kyara/parse.ts` **valident** la forme et renvoient un résultat vide. Elles ne lèvent jamais d'exception. |
| Élément du site introuvable (le site a changé) | On ignore l'offre ou la carte, sans erreur (`?.` et retour anticipé). |
| Extension rechargée pendant que la page est ouverte | Tout est nettoyé via `ctx.onInvalidated` de WXT, et plus aucun appel à `browser.*` n'est fait. Sinon : erreur « Extension context invalidated ». |
| `localStorage` inaccessible | On continue sans jeton. La requête échouera proprement (cas HTTP non OK). |

### Règles

- **Jamais de `catch {}` vide.** Au minimum un log de dev qui explique pourquoi l'erreur est ignorée.
- **Jamais de `throw` qui sort d'une feature.** Les erreurs sont converties en valeur (`null`, résultat vide) à la frontière du module.
- **Jamais de `innerHTML`** (ni `outerHTML`, `insertAdjacentHTML`) dans le code de l'extension : le linter d'addons.mozilla.org le signale. On construit les nœuds (`createElement`, `append`, `textContent`). Les tests peuvent l'utiliser pour monter un faux DOM.
- Les données externes (API, DOM, stockage) sont typées `unknown` puis validées avant usage. Pas de `as MonType` sur une donnée non vérifiée.
- **Pas de warning non plus** : pas de `console.warn` en prod, pas de permission inutile dans le manifest, pas de CSS invalide, pas d'API dépréciée. `pnpm check` et `pnpm build` doivent sortir sans aucun avertissement.

---

## 5 ter. Langue : tout en anglais

**Tout ce qui est écrit dans le dépôt est en anglais** : code (noms de variables, fonctions, types, fichiers), commentaires, README, docs, messages de commit, titres et descriptions de PR, logs de dev, scripts.

- Seules exceptions : les textes affichés à l'utilisateur, traduits dans `src/locales/*.json` (voir §6 bis), les textes du site recopiés tels quels (sélecteurs, libellés des pastilles du site dans les faux DOM de test), et ce fichier `CLAUDE.md`.
- Tout le dépôt est déjà en anglais : ne jamais réintroduire de français.
- Les réponses de Claude à l'utilisateur dans le chat restent en français.

---

## 6. Commentaires

But : comprendre un fichier **sans lire son code**. Les commentaires sont en **anglais** (voir §5 ter).

- **En tête de chaque fichier** : 2 à 5 lignes sur ce que fait le module, qui l'utilise, et ses effets de bord (requêtes réseau, écriture dans le stockage, DOM modifié).
- **Chaque fonction exportée** a un commentaire JSDoc `/** ... */` : ce qu'elle fait, ce qu'elle renvoie, les cas particuliers (`null` si…).
- **Dans le code**, on commente le *pourquoi*, pas le *quoi*. Exemple : `// the site always paints the ring green, restore the real rarity color`, et non `// change the color`.
- Les simplifications volontaires sont marquées `// ponytail: <limite> ; <quand l'améliorer>`.
- Les types TypeScript nomment les formes de données (`FairPrices`, `OwnedCards`…) : ils font partie de la documentation.

---

## 6 bis. Textes affichés (i18n)

- **Aucun texte visible dans le code.** Tout ce que l'utilisateur lit (boutons, infobulles, `title`, `aria-label`, nom et description du manifest) vit dans `src/locales/en.json` et `src/locales/fr.json`, et s'obtient avec `t("clé")` ou `tn("clé", n)` (`core/i18n.ts`).
- Les deux fichiers ont **exactement les mêmes clés et les mêmes `{paramètres}`** (un test le vérifie). Une clé ajoutée dans l'un l'est dans l'autre.
- Clés plates, `zone.nom` (ex. `gauge.mode.off`). Pluriel : `clé_one` et `clé_other`, appelés par `tn("clé", n)`.
- Langue : celle du navigateur (`navigator.language`), anglais si inconnue. Les tests forcent le français (`src/test/setup.ts`).
- Ne sont pas concernés : logs de dev (`log.debug`), commentaires, noms de clés de stockage.
- Nouvelle langue : un JSON de plus, une ligne dans `catalogs` (`core/i18n.ts`).
- Le manifest (`wxt.config.ts`) lit `en.json` : nom et description ne sont pas traduits selon la langue.

---

## 7. Tests

Les tests doivent être **complets** : chaque module de `core/`, `kyara/` et `features/` a son fichier `*.test.ts` à côté de lui.

### Ce qui doit être testé

- **Cas normal** : la fonction fait ce qu'elle annonce.
- **Cas limites** : liste vide, valeur `0`, `null`, prix manquant, plus de 200 ids (découpage en lots), TTL expiré ou non.
- **Cas d'erreur** : HTTP 401/429/500, `fetch` rejeté, JSON invalide, réponse de forme inattendue, élément DOM absent. Le test vérifie que **rien ne plante** et que le résultat de repli est le bon.
- **DOM des features** : on construit un faux HTML d'offre (copié de la structure réelle du site) avec happy-dom, on lance la feature, puis on vérifie les attributs `data-kv-*` posés.
- **Stockage** : avec `fakeBrowser` (en mémoire), réinitialisé avant chaque test (`fakeBrowser.reset()`).
- **Réseau** : `fetch` remplacé par un faux (`vi.fn()`) qui renvoie des réponses contrôlées. Aucun test n'appelle le vrai site.

### Règles

- Couverture minimale : **90 %** des lignes et des branches sur `core/` et `kyara/`, **80 %** sur `features/`. Vérifiée par `pnpm test:coverage` (seuils dans `vitest.config.ts`, le build échoue en dessous).
- Chaque bug corrigé ajoute un test qui échouait avant la correction.
- Un test vérifie aussi qu'aucun `console.error` ni `console.warn` n'est émis pendant son exécution.
- `pnpm test` et `pnpm check` doivent passer avant chaque commit.

---

## 7 bis. Logs : en dev uniquement

- **Interdit d'appeler `console.*` directement.** Tous les logs passent par `core/log.ts`.
- `log.ts` n'écrit que si `import.meta.env.DEV` est vrai (fourni par Vite/WXT) :
  - `pnpm dev` : les logs s'affichent, préfixés `[kyara-extension:<module>]` ;
  - `pnpm build` : la condition vaut `false` dès la compilation, donc le code de log est **retiré du bundle**. Aucun log, aucun coût en prod.
- Niveaux : `log.debug` (suivi normal : requêtes, rendus) et `log.error` (erreur attrapée par `safe()`, réponse invalide). Les deux sont muets en prod.
- Biome bloque tout `console.*` hors de `core/log.ts` (règle `noConsole`).
- Ne jamais loguer le jeton d'authentification ni d'autre donnée sensible, même en dev.

---

## 8. Commandes

```bash
pnpm dev        # Lance Firefox (profil gardé dans .firefox-profile/, connexion conservée) sur les Échanges, rechargement auto, logs actifs
pnpm build      # Build de production dans .output/, sans logs
pnpm build:debug # Build non minifié avec logs, dans .output/firefox-mv2-dev/
pnpm build:chrome # Build Chrome MV3 (sans cache passif), dans .output/chrome-mv3/
pnpm dev:chrome   # Lance Chrome avec l'extension, rechargement auto
pnpm zip        # Archives extension + sources (sans .env ni coverage) pour addons.mozilla.org
pnpm sign       # Soumet la version à addons.mozilla.org (listée, avec sources et amo-metadata.json)
pnpm release    # Depuis main : vérifs, `pnpm sign`, puis release GitHub (tag + changelog)
pnpm test       # Tests Vitest
pnpm test:coverage  # Tests + rapport de couverture (échoue sous les seuils)
pnpm check      # Biome (lint + format) + vérification TypeScript
```

---

## 9. Comment Claude explique son travail

L'utilisateur ne connaît pas en détail la base de code. Après chaque modification, l'explication doit :

- dire **ce qui change pour l'utilisateur** (ce qu'il verra ou non dans l'extension) avant les détails techniques ;
- nommer les fichiers touchés avec un lien, et dire en une phrase le rôle de chacun ;
- expliquer les termes techniques la première fois (ex. « debounce : on attend 300 ms sans changement avant de recalculer ») ;
- signaler clairement ce qui n'a pas été testé ou reste à faire.
