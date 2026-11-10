# Changelog

All notable changes to Kyara Extension. Format based on [Keep a Changelog](https://keepachangelog.com), versions follow [Semantic Versioning](https://semver.org).

HTML version: [`docs/changelog.html`](docs/changelog.html).

## [Unreleased]

### Added

- Booster page: "×N" option in the count picker that opens only your free boosters, without spending chakra. The site's chakra warning is skipped while it is chosen. If the site changes its opening request, the opening is cancelled and nothing is spent.
- Wanted cards: list card names in the filter panel to highlight offers proposing them, with a toggle to hide the other offers.
- Adjustable tint scale: choose the gain (10 to 200 %, default 100 %) at which an offer's color reaches full intensity.
- Keyboard shortcuts: `F` opens or closes the filter panel, `P` turns profitability colors on or off.
- Small spinner at the bottom right while fair-play prices are loading.
- Extension icons.

### Changed

- Rarity ring: falls back to the "Rare · …" text when the card's color is unknown.
- More robust to site updates: every site element is found with a fallback, and the extension's CSS no longer targets the site's classes.

## [0.3.0] - 2026-11-06

### Added

- "Donner" (give) buttons labelled with the gain (`+9◆ +5 %`, green or red) and sorted from most to least profitable.
- Gain in % on the badges and under the ⇄ arrow.
- "No other offer matches the filters" message when a load brings nothing.
- Screenshot in the README.

### Changed

- Only cards you can actually give count in the gain (owned and not locked).
- "Voir plus d'offres" loads 10 new visible offers per click, and waits for prices between loads.
- Fewer fair-play price requests: only visible offers you can accept.

### Fixed

- Give buttons are matched to owned cards despite the site's "(tu l'as)" suffix.

## 0.2.1 - 2026-11-06

No GitHub release: shipped with 0.3.0.

### Changed

- Listed submission to addons.mozilla.org (store description in `amo-metadata.json`).
- Whole repository translated to English.

## [0.2.0] - 2026-11-06

### Added

- Filter panel: funnel button next to the search field, with the site's filters and the extension's filters.
- Rarity filter (multi-select) and sort by profitability.
- Automatic "Voir plus d'offres" while a filter leaves too few visible offers, with a "Loading…" text on the button.
- Automatic Firefox updates.
- Release script (`pnpm release`).

## [0.1.0] - 2026-11-05

### Added

- First version: card values (`≈ G◆`, `G − W`), offer background tinted by profitability with an on/off pill, rarity ring, minimum market price on hover, "Gain min" filter.
- Rewrite on WXT + TypeScript, with Vitest tests and Biome.

[Unreleased]: https://github.com/OverCapi/kyara-extension/compare/v0.3.0...dev
[0.3.0]: https://github.com/OverCapi/kyara-extension/releases/tag/v0.3.0
[0.2.0]: https://github.com/OverCapi/kyara-extension/releases/tag/v0.2.0
[0.1.0]: https://github.com/OverCapi/kyara-extension/releases/tag/v0.1.0
