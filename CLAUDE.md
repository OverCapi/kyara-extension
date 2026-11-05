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

### Contrainte importante : Firefox uniquement (pour l'instant)

L'extension lit les réponses de l'API Kyara avec `webRequest.filterResponseData` (mode `blocking`), et fait ses requêtes avec `content.fetch`. **Ces deux API n'existent que sur Firefox**, en Manifest V2.

- Cible du build : `firefox`, en MV2 (c'est le défaut de WXT pour Firefox).
- Pour supporter Chrome plus tard, il faudra remplacer le cache passif. Chrome MV3 interdit `webRequestBlocking`. L'alternative : un script injecté dans la page (`world: "MAIN"`) qui intercepte `fetch` et transmet les réponses au content script. WXT gère ce cas, mais c'est un vrai chantier : ne pas le faire sans besoin.

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
    │   └── market-tooltip/  # Infobulle "Min marché" au survol
    │
    ├── kyara/               # Tout ce qui dépend du site kyara.games (si le site change, on modifie ici)
    │   ├── api.ts           # Appels à /api avec le jeton et le device id du site
    │   ├── parse.ts         # Lecture des réponses JSON (prix, fair-play, collection, annonces)
    │   ├── dom.ts           # Sélecteurs CSS du site et lecture des cartes d'une offre
    │   ├── prices.ts        # Valeur d'une carte et analyse de rentabilité d'une offre
    │   ├── collection.ts    # Cartes possédées (stockage, sinon une requête de rattrapage)
    │   ├── offers.ts        # Instantané partagé : offres + prix + cartes possédées
    │   ├── fair-play.ts     # Demande les prix fair-play manquants (lots, TTL, réessais)
    │   └── passive-cache.ts # Lit les réponses de l'API que le site charge déjà (background)
    │
    ├── core/                # Outils génériques, sans rien de spécifique à Kyara
    │   ├── storage.ts       # Accès typé à browser.storage (clés, types, TTL)
    │   ├── page.ts          # UN MutationObserver partagé + debounce, éléments flottants ajoutés à <html>
    │   ├── html.ts          # Échappement HTML
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

`FeatureContext` fournit les services partagés : `onOffers(cb)` (appelé à chaque mise à jour de la page avec offres, prix et cartes possédées) et `page` (le contexte WXT : `page.onInvalidated` pour tout nettoyer quand l'extension est rechargée).

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
| Réponse HTTP non OK (401, 429, 500…) | Pas de réessai immédiat, délai avant le prochain essai. Le badge affiche `?`. |
| Réseau coupé, `fetch` rejeté | Idem, sans exception non attrapée. |
| JSON invalide ou de forme inattendue | Les fonctions de `kyara/parse.ts` **valident** la forme et renvoient un résultat vide. Elles ne lèvent jamais d'exception. |
| Élément du site introuvable (le site a changé) | On ignore l'offre ou la carte, sans erreur (`?.` et retour anticipé). |
| Extension rechargée pendant que la page est ouverte | Tout est nettoyé via `ctx.onInvalidated` de WXT, et plus aucun appel à `browser.*` n'est fait. Sinon : erreur « Extension context invalidated ». |
| `localStorage` inaccessible | On continue sans jeton. La requête échouera proprement (cas HTTP non OK). |

### Règles

- **Jamais de `catch {}` vide.** Au minimum un log de dev qui explique pourquoi l'erreur est ignorée.
- **Jamais de `throw` qui sort d'une feature.** Les erreurs sont converties en valeur (`null`, résultat vide) à la frontière du module.
- Les données externes (API, DOM, stockage) sont typées `unknown` puis validées avant usage. Pas de `as MonType` sur une donnée non vérifiée.
- **Pas de warning non plus** : pas de `console.warn` en prod, pas de permission inutile dans le manifest, pas de CSS invalide, pas d'API dépréciée. `pnpm check` et `pnpm build` doivent sortir sans aucun avertissement.

---

## 6. Commentaires

But : comprendre un fichier **sans lire son code**. Les commentaires sont en **français**.

- **En tête de chaque fichier** : 2 à 5 lignes sur ce que fait le module, qui l'utilise, et ses effets de bord (requêtes réseau, écriture dans le stockage, DOM modifié).
- **Chaque fonction exportée** a un commentaire JSDoc `/** ... */` : ce qu'elle fait, ce qu'elle renvoie, les cas particuliers (`null` si…).
- **Dans le code**, on commente le *pourquoi*, pas le *quoi*. Exemple : `// le site met toujours l'anneau en vert, on reprend la vraie couleur de rareté`, et non `// on change la couleur`.
- Les simplifications volontaires sont marquées `// ponytail: <limite> ; <quand l'améliorer>`.
- Les types TypeScript nomment les formes de données (`FairPrices`, `OwnedCards`…) : ils font partie de la documentation.

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
pnpm dev        # Lance Firefox avec l'extension, rechargement auto, logs actifs
pnpm build      # Build de production dans .output/, sans logs
pnpm build:debug # Build non minifié avec logs, dans .output/firefox-mv2-dev/
pnpm zip        # Archive prête pour addons.mozilla.org
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
