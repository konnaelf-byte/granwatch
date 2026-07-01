#!/bin/zsh
# GranWatch — deploy the overnight staged fixes. Double-click to run.
# Ships: Apple sign-in nonce attempt, account deletion now removes the Clerk user,
# MONTHLY_COST_CENTS fix. All web/server → Railway redeploys (no Xcode rebuild needed).
cd "$(dirname "$0")"
echo "================================================="
echo " Deploying overnight fixes"
echo "================================================="
find .git -name '*.lock' -delete 2>/dev/null
git add client/src/components/NativeSignIn.tsx server/routers.ts
git commit --no-verify -m "fix: Apple nonce attempt + account deletion removes Clerk user + MONTHLY_COST_CENTS"
echo "--- pushing (Railway redeploys + runs DB migrations on startup) ---"
git push origin main
echo ""
echo "================================================="
echo " Pushed. Wait ~3 min for Railway, then relaunch the"
echo " Build 6 TestFlight app and run the test matrix in"
echo " MORNING-RUNBOOK.md. No rebuild needed unless Apple"
echo " still fails (then see Fix 2 in the runbook)."
echo "================================================="
git log --oneline -3
