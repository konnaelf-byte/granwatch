#!/bin/zsh
# Push already-committed work to origin (Railway auto-deploys). Generic pusher.
cd "$(dirname "$0")"
echo "================================================="
echo " GranWatch — push to origin/main"
echo "================================================="
find .git -name '*.lock' -delete 2>/dev/null
git push origin main
echo ""
echo "DONE. Railway is redeploying (migration 0013 widens the birthday column)."
osascript -e 'display notification "Birthday fix deployed. Migration 0013 runs on this deploy. Re-enter each gran birthday once with the full year and it will stick." with title "GranWatch · Claude" sound name "Glass"' 2>/dev/null
echo "================================================="
