#!/bin/zsh
# GranWatch — small UX polish (no new build). Double-click.
# Ships: appointment "Doctor name" -> "Name" (+ drop "Dr" prefix); Send Flowers / Send a Gift
# now link to Petal & Post (test-period partner; override later via VITE_PARTNER_*_URL env vars).
cd "$(dirname "$0")"
echo "================================================="
echo " GranWatch — deploy UX polish"
echo "================================================="
find .git -name '*.lock' -delete 2>/dev/null
git add \
  client/src/components/CareSchedulePanel.tsx \
  client/src/pages/ElderProfile.tsx
git commit --no-verify -m "polish: appointment Name field (generic, drop Dr prefix); wire Send Flowers/Gift to Petal & Post for test period"
echo "--- pushing (Railway redeploys; no build needed) ---"
git push origin main
echo ""
echo "================================================="
echo " DONE. ~2-3 min, then refresh the app and check:"
echo "  - Appointment form shows 'Name' (not 'Doctor name')"
echo "  - Send Flowers / Send a Gift open Petal & Post"
echo "================================================="
