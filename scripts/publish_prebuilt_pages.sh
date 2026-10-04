#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm install --no-audit --no-fund
npm run build

WORKTREE="$(mktemp -d)"
cleanup() {
  git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE"
}
trap cleanup EXIT

if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add "$WORKTREE" gh-pages
else
  git worktree add --detach "$WORKTREE"
  git -C "$WORKTREE" checkout --orphan gh-pages
fi

find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist/. "$WORKTREE"/
touch "$WORKTREE/.nojekyll"

git -C "$WORKTREE" add -A
if git -C "$WORKTREE" diff --cached --quiet; then
  echo "GitHub Pages output is unchanged."
  exit 0
fi

git -C "$WORKTREE" commit -m "Publish PubForge Pages"
git -C "$WORKTREE" push origin gh-pages
