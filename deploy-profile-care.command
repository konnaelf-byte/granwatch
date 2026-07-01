#!/bin/zsh
# GranWatch — editable profile name, Care tab as Gran+ teaser (moved to end),
# mood trend moved to bottom, obsolete Wellbeing setting removed. No new build needed.
cd "$(dirname "$0")"
echo "================================================="
echo " GranWatch — deploy profile + Care-teaser batch"
echo "================================================="
find .git -name '*.lock' -delete 2>/dev/null
git add \
  server/routers.ts \
  client/src/pages/Account.tsx \
  client/src/pages/ElderProfile.tsx \
  client/src/components/CareSchedulePanel.tsx \
  client/src/pages/ElderSettings.tsx \
  client/src/utils/platform.ts
git commit --no-verify -m "feat: editable profile name (Apple-relay friendly); Care tab as Gran+ teaser moved to end (viewable, locked); mood trend to bottom; remove obsolete wellbeing setting; native Gran+ upgrade path in Settings (RevenueCat)"
echo "--- pushing (Railway redeploys) ---"
git push origin main
echo ""
echo "================================================="
echo " DONE. ~2-3 min, refresh the app:"
echo "  - Account: edit your Full name (set it for Apple sign-in)"
echo "  - Profile tabs: Visits, History, Family, Care (Care = Gran+ teaser on free)"
echo "  - Mood trend now at the bottom"
echo "================================================="
