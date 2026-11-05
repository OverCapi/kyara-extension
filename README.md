# Kyara Extension

Extension Firefox pour [kyara.games](https://kyara.games) : dans l'onglet **Marché → Échanges**, affiche la valeur des cartes et la rentabilité de chaque offre, et permet de filtrer et trier les offres.

- Badge sur chaque carte : `≈ G◆` sur la carte proposée, `G − W` sur les cartes demandées.
- Fond de l'offre teinté du bleu (gain) au rouge (perte), selon le meilleur gain relatif parmi tes cartes. Pastille « Rentabilité on/off » en bas à gauche.
- Anneau autour des cartes à la couleur officielle de leur rareté.
- Survol d'une carte : prix minimum actuel sur le marché.
- **Panneau de filtres** : un bouton à icône d'entonnoir, à droite de la recherche, ouvre une fenêtre à deux sections.
  - *Filtres Kyara* : les pastilles du site (Que je n'ai pas, Que je peux accepter…), reprises à l'identique et rangées en catégories.
  - *Filtres de l'extension* :
    - **Rentabilité** : Off / Neutre et + / Positif, et un curseur de gain minimum (pas de 1 %) ;
    - **Rareté** : une ou plusieurs raretés de la carte proposée (aucune cochée = toutes) ;
    - **Tri** : offres classées de la plus rentable à la moins rentable.
- Les offres filtrées ou triées n'apparaissent jamais avant d'être traitées (pas de clignotement). Quand un filtre laisse moins de 10 offres visibles, « Voir plus d'offres » est cliqué automatiquement (25 fois au maximum d'affilée), avec une pastille « Chargement… » en bas de page.
- Les valeurs inconnues n'affichent rien (jamais de `?`).
- Textes en français et en anglais, selon la langue du navigateur.

Ce n'est pas un bot : l'extension n'agit jamais à ta place. Elle lit les réponses que le site charge déjà, et ne fait que quelques requêtes groupées (`/api/fair-play/prices`, max 200 ids) limitées aux offres que tu peux accepter, plus une requête par carte survolée.

Stack : [WXT](https://wxt.dev) + TypeScript. Règles du projet : [CLAUDE.md](CLAUDE.md).

Les textes affichés sont dans [`src/locales/en.json`](src/locales/en.json) et [`src/locales/fr.json`](src/locales/fr.json) : aucun texte visible n'est écrit dans le code.

## Développement

```bash
pnpm install
```

```bash
pnpm dev
```

`pnpm dev` ouvre Firefox sur les Échanges avec l'extension, et la recharge à chaque modification. Firefox utilise un profil à part, gardé dans `.firefox-profile/` (non versionné) : connecte-toi à kyara.games une seule fois. Les logs `[kyara-extension:…]` s'affichent dans la console de la page (F12) et dans `about:debugging` → Inspecter pour le script de fond.

## Installation (build de production)

```bash
pnpm build
```

1. Ouvrir `about:debugging#/runtime/this-firefox`.
2. « Charger un module complémentaire temporaire… » → choisir `.output/firefox-mv2/manifest.json`.
3. Navigation privée : `about:addons` → Kyara Extension → « Exécuter dans des fenêtres privées » → Autoriser.

Le build de production ne contient aucun log.

## Chrome (partiel)

```bash
pnpm build:chrome
```

Build Chrome (Manifest V3) dans `.output/chrome-mv3/`, à charger via `chrome://extensions` → Mode développeur → « Charger l'extension non empaquetée ». Le cache passif des prix n'existe que sur Firefox : sur Chrome, les prix viennent seulement des requêtes fair-play, donc moins de badges. Firefox reste la cible de référence.

## Tests et vérifications

```bash
pnpm test
```

```bash
pnpm test:coverage
```

```bash
pnpm check
```
