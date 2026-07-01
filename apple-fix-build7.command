#!/bin/zsh
# GranWatch — Apple web-OAuth fix → Build 7. Double-click.
# Pushes the web changes (Railway) AND syncs native config for a rebuild.
cd "$(dirname "$0")"
echo "================================================="
echo " Apple fix → Build 7 prep"
echo "================================================="
find .git -name '*.lock' -delete 2>/dev/null
git add client/src/components/NativeSignIn.tsx client/src/App.tsx capacitor.config.json ios/App/App/Info.plist ios/App/App.xcodeproj/project.pbxproj
git commit --no-verify -m "fix(apple): web OAuth (Services ID) in WebView + allowNavigation + sso-callback; build 7"
echo "--- pushing (Railway redeploys web) ---"
git push origin main
echo "--- cap:build (vite build + cap sync incl. allowNavigation + RevenueCat fix) ---"
pnpm run cap:build
echo ""
echo "================================================="
echo " DONE. Web pushed; native synced for Build 7."
echo " Tell Claude 'synced' and it will drive the Xcode"
echo " archive + upload for Build 7."
echo "================================================="
