#!/usr/bin/env bash
# Local Firefox release (`pnpm release`): checks, gets the .xpi signed by Mozilla (AMO, unlisted),
# then creates the GitHub release v<version> with firefox.xpi (README link) and updates.json
# (read by Firefox through gecko.update_url for automatic updates).
# Run from main, up to date with origin/main, with a package.json "version" never published before.
# AMO keys: AMO_JWT_ISSUER / AMO_JWT_SECRET variables, or a .env file (not versioned).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] && set -a && source .env && set +a
: "${AMO_JWT_ISSUER:?missing (export or .env)}"
: "${AMO_JWT_SECRET:?missing (export or .env)}"

fail() { echo "✗ $1" >&2; exit 1; }

[ "$(git branch --show-current)" = main ] || fail "Switch to main before publishing."
[ -z "$(git status --porcelain)" ] || fail "There are uncommitted changes."
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail "main is not in sync with origin/main (pull or push)."

version="$(node -p 'require("./package.json").version')"
tag="v$version"
# AMO refuses to sign the same version twice.
gh release view "$tag" >/dev/null 2>&1 && fail "Release $tag already exists: bump \"version\" in package.json."

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
echo "✓ Release $tag published."
