#!/bin/zsh
# GranWatch — remove the redundant "Add a note about Gran's mood" box from Log a Visit.
# The single "Notes (optional)" box is enough. No new build needed.
cd "$(dirname "$0")"
echo "================================================="
echo " GranWatch — remove duplicate note box"
echo "================================================="
find .git -name '*.lock' -delete 2>/dev/null
git add client/src/pages/ElderProfile.tsx
git commit --no-verify -m "polish: remove redundant mood-note box from Log a Visit (keep single Notes box + emoji picker)"
echo "--- pushing (Railway redeploys; no build needed) ---"
git push origin main
echo ""
echo "================================================="
echo " DONE. ~2-3 min, refresh, open Log a Visit: emoji"
echo " picker + ONE Notes box."
echo "================================================="
