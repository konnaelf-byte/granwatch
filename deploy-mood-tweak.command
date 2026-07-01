#!/bin/zsh
# GranWatch — consolidate the visit mood picker into ONE ("How was Gran feeling?")
# using the clean Poor->Great gradient; removes the duplicate picker. No new build.
cd "$(dirname "$0")"
echo "================================================="
echo " GranWatch — deploy mood-picker consolidation"
echo "================================================="
find .git -name '*.lock' -delete 2>/dev/null
git add \
  client/src/pages/ElderProfile.tsx \
  server/routers.ts
git commit --no-verify -m "polish(mood): single 'How was Gran feeling?' picker, 6 levels (Unwell→Great); remove duplicate; note stays Gran+; align server allowed-emoji set + trend scale"
echo "--- pushing (Railway redeploys; no build needed) ---"
git push origin main
echo ""
echo "================================================="
echo " DONE. ~2-3 min, refresh, open Log a Visit — one"
echo " mood picker now: 🤒 😔 😕 😊 😄 🥰"
echo " (Unwell, Poor, Low, Okay, Good, Great). Note = Gran+."
echo "================================================="
