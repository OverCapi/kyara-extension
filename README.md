# Kyara Extension

Extension Firefox pour [kyara.games](https://kyara.games) : dans l'onglet **Marché → Échanges**, affiche la valeur des cartes et la rentabilité de chaque offre.

- Badge sur chaque carte : `≈ G◆` sur la carte proposée, `G − W` sur les cartes demandées.
- Fond de l'offre teinté du bleu (gain) au rouge (perte), selon le meilleur gain relatif parmi tes cartes. Pastille « Rentabilité on/off » en bas à gauche.
- Anneau autour des cartes à la couleur officielle de leur rareté.
- Survol d'une carte : prix minimum actuel sur le marché.

Ce n'est pas un bot : l'extension n'agit jamais à ta place. Elle lit les réponses que le site charge déjà, et ne fait que quelques requêtes groupées (`/api/fair-play/prices`, max 200 ids) limitées aux offres que tu peux accepter, plus une requête par carte survolée.

## Installation (temporaire)

1. Ouvrir `about:debugging#/runtime/this-firefox`.
2. « Charger un module complémentaire temporaire… » → choisir `manifest.json`.
3. Navigation privée : `about:addons` → Kyara Extension → « Exécuter dans des fenêtres privées » → Autoriser.

## Test

```bash
node test.mjs
```
