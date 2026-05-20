# Known Issues

## "Authorize params not found" on Manus OAuth sign-in

**Status:** Platform limitation (not an app-level bug)

**Observed:** 2026-04-16. A new user (Hettie Spies, he.spies@gmail.com) saw an "Authorize params not found" error on the manus.im OAuth page during sign-up. The error appeared transiently — the user was ultimately able to sign up and join a family successfully.

**Root cause:** The error originates from the Manus OAuth platform (`manus.im`), not from GranWatch's code. It can occur when:
- The browser blocks third-party cookies (Safari Private Browsing, Firefox Strict ETP, Brave Aggressive Shields)
- The OAuth state parameter gets corrupted during redirect
- There is a transient issue on the Manus OAuth server

**Mitigation:** GranWatch correctly constructs the login URL with all required parameters (`appId`, `redirectUri`, `state`, `type`). If users encounter this error, advise them to:
1. Try again (often resolves on retry)
2. Use a different browser or disable strict cookie blocking
3. Clear browser cache and try again

**Not fixable at app level** — the error occurs before GranWatch's OAuth callback is reached.
