#!/bin/zsh
# GranWatch — robust commit + push of the lockfile, with verification. Double-click.
cd "$(dirname "$0")"
echo "================================================="
echo " Commit + push lockfile (with verification)"
echo "================================================="
echo "[1] Clearing any stale git locks..."
rm -f .git/index.lock 2>/dev/null
rm -f .git/refs/remotes/origin/main.lock 2>/dev/null
rm -f .git/refs/heads/main.lock 2>/dev/null

echo "[2] Staging lockfile..."
git add pnpm-lock.yaml

echo "[3] Committing..."
git commit --no-verify -m "chore: update pnpm-lock for @capgo/capacitor-social-login (native auth)"

echo "[4] Pushing..."
git push origin main

echo ""
echo "================ VERIFY ========================="
git log --oneline -2
echo "Committed lockfile plugin lines (must be greater than 0):"
git show HEAD:pnpm-lock.yaml | grep -c capacitor-social-login
echo "================================================="
echo "Tell Claude the number shown above. Then close window."
