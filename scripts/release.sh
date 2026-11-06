#!/usr/bin/env bash
# Release Firefox en local (`pnpm release`) : vérifie, fait signer le .xpi par Mozilla (AMO, unlisted),
# puis crée la release GitHub v<version> avec firefox.xpi (lien du README) et updates.json
# (lu par Firefox via gecko.update_url pour les mises à jour auto).
# À lancer depuis main, à jour avec origin/main, avec une "version" de package.json jamais publiée.
# Clés AMO : variables AMO_JWT_ISSUER / AMO_JWT_SECRET, ou fichier .env (non versionné).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] && set -a && source .env && set +a
: "${AMO_JWT_ISSUER:?manquant (export ou .env)}"
: "${AMO_JWT_SECRET:?manquant (export ou .env)}"

fail() { echo "✗ $1" >&2; exit 1; }

[ "$(git branch --show-current)" = main ] || fail "Passe sur main avant de publier."
[ -z "$(git status --porcelain)" ] || fail "Des modifications ne sont pas commitées."
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail "main n'est pas à jour avec origin/main (pull ou push)."

version="$(node -p 'require("./package.json").version')"
tag="v$version"
# AMO refuse de signer deux fois la même version.
gh release view "$tag" >/dev/null 2>&1 && fail "La release $tag existe déjà : augmente \"version\" dans package.json."

pnpm check
pnpm test

rm -rf .output/signed .output/release
pnpm sign

mkdir -p .output/release
cp .output/signed/*.xpi .output/release/firefox.xpi
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
VERSION="$version" LINK="https://github.com/$repo/releases/download/$tag/firefox.xpi" node -e '
  const { VERSION: version, LINK: update_link } = process.env;
  const updates = { addons: { "kyara-extension@local": { updates: [{ version, update_link }] } } };
  require("fs").writeFileSync(".output/release/updates.json", JSON.stringify(updates, null, 2));
'

gh release create "$tag" .output/release/firefox.xpi .output/release/updates.json \
  --target main --generate-notes
echo "✓ Release $tag publiée."
