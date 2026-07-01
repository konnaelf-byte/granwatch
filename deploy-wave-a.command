#!/bin/zsh
# GranWatch — Wave A: visit mood (free emoji) + custom note (Gran+) + mood trend chart.
# No new TestFlight build needed. Railway redeploys + runs migration 0012 (adds visit columns).
cd "$(dirname "$0")"
echo "================================================="
echo " GranWatch — deploy Wave A (visit mood + trends)"
echo "================================================="
find .git -name '*.lock' -delete 2>/dev/null
git add \
  drizzle/0012_visit_mood.sql \
  drizzle/meta/_journal.json \
  drizzle/schema.ts \
  server/routers.ts \
  client/src/pages/ElderProfile.tsx
git commit --no-verify -m "feat(mood): log visit mood emoji (free) + custom note (Gran+) + mood trend chart; migration 0012 adds visits.moodEmoji/moodNote"
echo "--- pushing (Railway redeploys + runs migration 0012) ---"
git push origin main
echo ""
echo "================================================="
echo " DONE. ~2-3 min, then in the app: Log a Visit, pick"
echo " a mood emoji (free). The note box + Mood trend are"
echo " Gran+ — locked for free grans, open for Gran+ ones."
echo "================================================="
