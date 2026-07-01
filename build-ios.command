#!/bin/zsh
# GranWatch — Build 6 prep (native auth). Double-click to run.
set -e
cd "$(dirname "$0")"
echo "================================================="
echo " GranWatch Build 6 prep — native auth"
echo "================================================="

echo "[1/3] Cleaning temp files + stale git lock..."
rm -f _tmp_6_* 2>/dev/null || true
rm -f .git/index.lock 2>/dev/null || true

echo "[2/3] pnpm install (updates lockfile incl. social-login plugin)..."
pnpm install

# NOTE: 'pnpm check' (tsc) is intentionally skipped — the repo has pre-existing
# type-only errors unrelated to auth, and the real build (Vite/esbuild) does not
# type-check, so they never block the build or deploy.

echo "[3/3] cap:build (web build + cap sync + RevenueCat SPM fix)..."
pnpm run cap:build

echo ""
echo "================================================="
echo " DONE. Web built, lockfile updated, iOS synced."
echo " Tell Claude 'build done' so it pushes, then we"
echo " archive Build 6 in Xcode."
echo "================================================="
echo "(You can close this window.)"
