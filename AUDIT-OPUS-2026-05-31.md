# GranWatch Full Audit Report — Opus 4
*Generated 31 May 2026*

---

# Prioritized Top 10 Before Launch

| # | Severity | Finding | File |
|---|----------|---------|------|
| 1 | 🔴 Critical | **`subscription.setPaid` — anyone can unlock Gran+ for free.** Any elder-admin (i.e. any user who created a profile) can call this mutation and get all paid features without paying. Must be removed or locked to global owner-admin before launch. | `server/routers.ts:741` |
| 2 | 🔴 Critical | **No foreign keys or cascade deletes in the schema.** Referential integrity is only enforced in app code. Any missed cleanup leaves orphaned rows. | `drizzle/schema.ts` |
| 3 | 🔴 Critical | **No database indexes on `elderId`/`userId` filter columns.** Every visit/member/notification query is a full table scan. Will collapse under real traffic. | `drizzle/schema.ts` |
| 4 | 🔴 Critical | **`MONTHLY_COST` inconsistency.** Live code uses R79/7900 cents, but `stripeProducts.ts` still says R27/2700 and the test (`granwatch.test.ts:125`) asserts against 2700 — giving false passing tests. | `server/stripeProducts.ts`, `server/granwatch.test.ts:125` |
| 5 | 🔴 Critical | **Cron job is not crash-safe.** Runs as an in-process `setTimeout`. Any Railway restart silently drops that night's notifications. No idempotency guard, no last-run persistence. | `server/cron.ts` |
| 6 | 🟡 Medium | **Account deletion doesn't cancel the Lemon Squeezy subscription or delete R2 photos.** Deleted user's card keeps getting charged; their photos stay in R2 (GDPR gap). | `server/routers.ts:61` |
| 7 | 🟡 Medium | **Info.plist has unused permission strings.** `NSPhotoLibraryAddUsageDescription` (no save-to-library code) and `NSUserNotificationUsageDescription` (no push plugin) will trigger App Store rejection. | `ios/App/App/Info.plist` |
| 8 | 🟡 Medium | **`visits.log` accepts future-dated visits.** A user can log tomorrow's visit, which resets Gran's status to green and suppresses the whole family's alerts. | `server/routers.ts:474` |
| 9 | 🟡 Medium | **`smartNotify.test` lets any elder-admin blast real emails to the whole family.** Abuse vector — should be global owner-admin only or removed. | `server/routers.ts:840` |
| 10 | 🟡 Medium | **N+1 query patterns** in `cron.ts`, `elders.members`, `visits.list`, `notifications.list`, `admin.listElders`. On real traffic, these become hundreds of sequential DB queries. | `server/routers.ts`, `server/cron.ts` |

---

## 1. SECURITY

### 🔴 `subscription.setPaid` — free Gran+ exploit
**File:** `server/routers.ts:741-756`
Any authenticated user who creates a gran profile becomes an "elder admin" automatically. The `setPaid` mutation only checks elder-admin, so any user can set `isPaid: true` for free. Gran+ features (wellbeing, care notes, unlimited members) all unlock with no payment.
**Fix:** Delete this procedure entirely, or gate behind the global owner `adminProcedure` (not elder-admin). It's marked "for demo/testing" — it must not ship.

### 🟡 `adminProcedure` middleware defined but unused for admin routes
**File:** `server/_core/trpc.ts:30-45` vs `server/routers.ts:955, 975`
Admin routes reimplement role checks inline instead of using the already-defined `adminProcedure`. Inconsistent and brittle.
**Fix:** Use `adminProcedure` for all `admin.*` routes and `smartNotify.test`.

### 🟡 `smartNotify.test` is an email spam vector
**File:** `server/routers.ts:840-949`
Any elder-admin can trigger real emails to all family members on demand. Abusable.
**Fix:** Gate behind global `adminProcedure` or remove for launch.

### ✅ Lemon Squeezy webhook correctly verified (HMAC-SHA256, raw body, timing-safe compare)
### ✅ No secrets hardcoded; no sensitive data in logs
### ✅ No SQL injection risk (Drizzle parameterized queries throughout)
### ✅ Payment UI correctly gated behind `!isNativeApp` in all components

---

## 2. BUGS & EDGE CASES

### 🔴 Cron job has no crash recovery
**File:** `server/cron.ts:34-62`
In-process `setTimeout` chain. A Railway deploy or process restart between runs silently drops notifications for that night. No catch-up on restart. If Railway ever runs 2 replicas, every family gets duplicate emails.
**Fix:** Persist "last successful run date" in the DB; on startup, if today's run hasn't happened yet, fire immediately. Long-term: use Railway cron or an external scheduler.

### 🟡 Visit log accepts future dates
**File:** `server/routers.ts:474-503`
No validation that `visitedAt` is not in the future. A user can game Gran's status by logging tomorrow's visit.
**Fix:** `if (new Date(input.visitedAt) > new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Visit date cannot be in the future" })`

### 🟡 No duplicate visit protection
Same user can log 10 visits in one day (double-tap, retries). Pollutes history.
**Fix:** Debounce client-side, or add server-side dedup on (elderId, userId, calendar-day).

### 🟡 Member limit (20) has a race condition
**File:** `server/routers.ts:335-336`
Read-then-insert with no transaction lock. Concurrent joins can exceed 20.

### 🟢 Account deletion is thorough for DB cleanup — but misses LS cancellation and R2 photo deletion (see §6)

---

## 3. APP STORE READINESS

### 🟡 Info.plist has unused permission strings — App Store will flag
**File:** `ios/App/App/Info.plist`
- `NSPhotoLibraryAddUsageDescription` — no save-to-library code exists
- `NSUserNotificationUsageDescription` — no `@capacitor/push-notifications` plugin installed; push is email-only
- `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` — photo upload uses a plain web `<input type="file">` which does NOT invoke native camera APIs on iOS WebView, so these may also be flagged

**Fix:** Remove `NSPhotoLibraryAddUsageDescription` and `NSUserNotificationUsageDescription` immediately. Check whether iOS WebView file picker actually triggers the camera/photo permission prompts before keeping those two.

### ✅ `capacitor.config.json` is correct (`appId: "app.granwatch"`, `webDir: "dist/public"`)
### ✅ All Gran+ payment UI gated behind `!isNativeApp` — consistent across all components
### ✅ No `http://` URLs that should be `https://`

---

## 4. CODE QUALITY

### 🟡 `stripeProducts.ts` is dead code with wrong pricing
**File:** `server/stripeProducts.ts`
Not imported anywhere in production code. Still declares `MONTHLY_COST_CENTS = 2700` / `"R27"` (Stripe-era pricing). The live price is R79/7900.
**Fix:** Delete file. Fix `granwatch.test.ts:125` which also asserts against `2700`.

### 🟢 `payfastRoute.ts` is correctly stubbed (returns 410 Gone) — harmless

### 🟢 Console.logs are operational and prefixed — acceptable for Railway backend

### 🟢 Manus leftovers to remove before launch
- `client/public/__manus__/` directory
- `.manus/` directory
- `ManusDialog.tsx` component (unused)
- `ComponentShowcase.tsx` (unreachable from routing, dev-only)

---

## 5. PERFORMANCE

### 🟡 N+1 query patterns in multiple endpoints
`elders.members`, `visits.list`, `planned.list`, `subscription.status`, `notifications.list`, `admin.listElders`, and worst of all `cron.ts` — all loop and query per row instead of bulk-fetching.
The correct pattern already exists: see `elders.list` (`routers.ts:137-165`) which does a single bulk `inArray()` then builds an in-memory map.
**Fix:** Apply the same bulk-fetch pattern to the endpoints above.

### 🔴 No database indexes on high-traffic filter columns
**File:** `drizzle/schema.ts`
`elderMembers(userId)`, `elderMembers(elderId)`, `visits(elderId)`, `visits(userId)`, `plannedVisits(elderId)`, `notifications(userId)`, `subscriptionContributions(elderId)` — none indexed.
**Fix:** Add `index()` definitions and generate a migration.

---

## 6. DATA INTEGRITY

### 🔴 No foreign keys in schema
**File:** `drizzle/schema.ts`
All `elderId`/`userId` columns are plain `int().notNull()` with no `.references()`. DB enforces nothing; all integrity is in application code. A code path that misses a cleanup table leaves orphaned rows permanently.
**Fix:** Add `.references(() => elders.id, { onDelete: "cascade" })` etc. and migrate.

### 🟡 Account deletion: Lemon Squeezy subscription not cancelled, R2 photos not deleted
**File:** `server/routers.ts:61-118`
- Active LS subscription keeps billing the deleted user's card
- Uploaded profile photos stay in R2 (privacy/GDPR violation — user requested full deletion)
**Fix:** On account deletion, call LS API to cancel active subscriptions; call `storageDelete()` for all `gran-photos/{userId}/...` keys.

### 🟡 Future-dated visits break the alert system
Already covered in §2.

### 🔴 MONTHLY_COST is inconsistent
- `routers.ts:697` — `7900` (R79, correct, live)
- `GranPlusModal.tsx:188` — `7900` hardcoded (correct but should reference a constant)
- `stripeProducts.ts:16` — `2700` (R27, wrong, dead code)
- `granwatch.test.ts:125` — `2700` (wrong, gives false-passing tests)
**Fix:** Create `shared/constants.ts` → `export const MONTHLY_COST_CENTS = 7900`. Import in both `routers.ts` and `GranPlusModal.tsx`. Delete `stripeProducts.ts`. Fix the test. Verify LS variant 1681701 is priced at R79.

---

## Config checklist (not code, but launch-blocking)
- [ ] Flip Clerk to production keys (`pk_live_` / `sk_live_`) in Railway
- [ ] Confirm `R2_PUBLIC_URL` is set in Railway (required to fix photo expiry bug)
- [ ] Confirm `LEMONSQUEEZY_WEBHOOK_SECRET` is set in Railway
- [ ] Verify Lemon Squeezy variant 1681701 is priced at R79/month

---

*Audit by Claude Opus 4 · 31 May 2026*
