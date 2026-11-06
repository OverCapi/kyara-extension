#!/usr/bin/env bash
# Local Firefox release (`pnpm release`): checks, submits the version to addons.mozilla.org (listed,
# with sources and amo-metadata.json), then creates the GitHub release v<version> (tag + changelog).
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

# Uploads the build + sources to addons.mozilla.org (listed channel). Mozilla reviews it, then publishes
# it on the store and pushes the update to every installed copy. No .xpi comes back at this point.
pnpm sign

# GitHub release = tag + changelog only; the extension itself is distributed by AMO.
gh release create "$tag" --target main --generate-notes
echo "✓ $tag submitted to addons.mozilla.org for review, GitHub release created."
