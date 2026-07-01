#!/bin/zsh
# GranWatch — deploy web/DB fixes (NO new TestFlight build needed). Double-click.
# Ships: care-schedule migration fix (meds/appointments tables), 999-days new-profile
# state, feature renames (Appointments/Routines), and stronger liability T&Cs.
# Railway redeploys on push and runs migrations at startup → creates the missing tables.
cd "$(dirname "$0")"
echo "================================================="
echo " GranWatch — deploy web + DB fixes"
echo "================================================="
find .git -name '*.lock' -delete 2>/dev/null
# Remove the redundant/failing GitHub Action (real deploys go via Railway's native integration)
git rm -f --ignore-unmatch .github/workflows/deploy.yml 2>/dev/null
git add \
  drizzle/0009_push_tokens.sql \
  drizzle/0010_care_schedules.sql \
  drizzle/0011_gift_logs.sql \
  drizzle/meta/_journal.json \
  client/src/components/StatusRing.tsx \
  client/src/pages/ElderProfile.tsx \
  client/src/pages/Dashboard.tsx \
  client/src/hooks/useWidgetSync.ts \
  client/src/components/CareSchedulePanel.tsx \
  client/src/pages/Terms.tsx \
  client/src/components/NativeSignIn.tsx \
  client/src/pages/ElderSettings.tsx \
  server/routers.ts
git commit --no-verify -m "fix: correct migration journal timestamps so care-schedule migrations apply (meds/appointments); drop dosage field from routine form; add delete-a-gran (admin only); remove dead Railway GH Action; (prior batch: renames, calm new-profile, T&Cs, auth UX)"
echo "--- pushing (Railway redeploys + runs migrations) ---"
git push origin main
echo ""
echo "================================================="
echo " DONE. Give Railway ~2-3 min to redeploy, then in"
echo " the app (no reinstall needed) try Add Routine /"
echo " Add Appointment again — they should save now."
echo "================================================="
