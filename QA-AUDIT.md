# GranWatch — Read-Only QA & Security Audit

**Date:** 2026-06-24
**Scope:** Server authorization, payment integrity, data integrity, input validation, secrets, cron safety, dead code, client gating.
**Method:** Static read of `server/`, `drizzle/`, `client/src/`. No code changed, no git run.

Overall the codebase is in good shape for submission: the highest-risk surfaces (RevenueCat/Lemon Squeezy activation, owner-only `setPaid`, care-schedule gating, account/elder deletion, cron crash-safety) are correctly implemented. The findings below are mostly two genuine IDOR/authorization gaps on the subscription endpoints, some orphan-row cleanup on account deletion, and minor input-validation / dead-code items.

---

## CRITICAL

_None._ No way for an ordinary user to self-grant Gran+, and no payment can be marked paid without a verified RevenueCat entitlement or signature-verified Lemon Squeezy webhook (verified below).

---

## HIGH

### H1 — IDOR: `subscription.status` leaks another family's data (no membership check)
**File:** `server/routers.ts:861-894` (`subscription.status`)
**What's wrong:** The query takes a client-supplied `elderId` and returns `isPaid`, the full contributor list **including each contributor's name and email** (lines 875-881), contributor count and per-person cost — but never checks that `ctx.user` is a member of that elder. Every other elder-scoped procedure in the file gates on `elderMembers`; this one does not.
**Impact:** Any authenticated user can enumerate `elderId` values and harvest the names + email addresses of every contributor on every family in the system. PII disclosure across tenant boundaries.
**Fix:** Add the standard membership guard before reading, mirroring `elders.get`:
```ts
const [membership] = await db.select().from(elderMembers)
  .where(and(eq(elderMembers.elderId, input.elderId), eq(elderMembers.userId, ctx.user.id))).limit(1);
if (!membership) throw new Error("Not a member of this elder's family");
```

### H2 — IDOR / data tampering: `subscription.toggleContribution` has no membership check
**File:** `server/routers.ts:897-923` (`subscription.toggleContribution`)
**What's wrong:** Inserts/flips a `subscriptionContributions` row for `ctx.user.id` against any client-supplied `elderId` with no membership verification.
**Impact:** A non-member can insert themselves as a "contributor" on an arbitrary elder. They then appear (with their name/isMe) in that family's contributor list (via H1), and — more importantly — the row participates in the deactivation logic: in `deactivateGranPlus` (`lemonSqueezyRoute.ts:184-193` and `revenueCatRouter.ts:135-145`) the elder's `isPaid` is only dropped when **no active contributions remain**. A stray attacker-created active row can keep a cancelled/expired elder marked `isPaid = true`, effectively granting Gran+ indefinitely after the real payer cancels. This makes it an indirect payment-integrity bug, not just data noise.
**Fix:** Require membership before insert/toggle (same guard as H1). Consider also restricting "contribution" to users who actually have a verified entitlement, since the row currently has payment-state side effects.

### H3 — Account deletion leaves orphan rows in several tables
**File:** `server/routers.ts:142-225` (`auth.deleteAccount`)
**What's wrong:** When a user deletes their account the code removes them from `elderMembers`, `visits`, `plannedVisits`, `notifications`, `subscriptionContributions`, then deletes the `users` row. It does **not** delete the user's rows in:
- `referrals` (`userId`, has a UNIQUE constraint) and `referralSignups` (`newUserId`)
- `giftLogs` (`sentByUserId`)
- `medicationLogs` (`loggedByUserId`) and `pushTokens` (`userId`)

None of these tables has a FK to `users` (schema.ts defines no `.references()` on user columns; only the care/gift tables cascade off `elders.id`). So these rows remain pointing at a now-deleted user id.
**Impact:**
- Stale `pushTokens` keep receiving cron push for a deleted account until the device token naturally expires.
- `giftLogs`/`medicationLogs` joins resolve `senderName`/logger to "A family member" (handled gracefully), but the rows are residual personal data after an Apple-mandated "delete my account" — a GDPR/App-Store-guideline concern.
- The leftover `referrals` row keeps the deleted user's UNIQUE `userId`; if that numeric id were ever reused it would collide. Referral conversion counts also keep crediting a ghost referrer.
**Fix:** In `deleteAccount`, also delete `pushTokens`, `giftLogs`, `medicationLogs`, `referrals`, and `referralSignups` for the user. Better long-term: add FK constraints with `ON DELETE CASCADE` (or `SET NULL` for audit-log columns like `loggedByUserId`/`sentByUserId`) so cleanup can't drift out of sync with the manual delete list.

---

## MEDIUM

### M1 — Elder deletion leaves `referrals`/`referralSignups` untouched (consistent with H3)
**File:** `server/routers.ts:523-563` (`elders.delete`)
This path correctly relies on FK cascade for care tables + giftLogs and explicit deletes for the no-FK tables. It is fine for elder-scoped data. (Listed here only to note referral tables are user-scoped, not elder-scoped, so they are correctly out of scope for this procedure — no action needed beyond H3.)

### M2 — `planned.book` accepts arbitrary / past / far-future `plannedDate`; no bounds on `recurringWeeks`
**File:** `server/routers.ts:725-754`
**What's wrong:** `plannedDate: z.string()` is parsed with `new Date(input.plannedDate)` with no validation. An invalid string yields `Invalid Date` (stored as a bad timestamp / insert error), a past date is silently accepted, and `recurringWeeks` (`z.number().optional()`) has no min/max.
**Impact:** Low-severity data integrity — booking a past "future" visit, or a `recurringWeeks` of 0/negative/huge. Note `visits.log` *does* reject future dates (line 661); `planned.book` has no symmetric guard.
**Fix:** Validate with `z.string().datetime()` (or check `!isNaN(date)` and `date > new Date()`), and bound `recurringWeeks` e.g. `z.number().int().min(1).max(52)`.

### M3 — `recordSignup` / referral code: case-handling mismatch
**File:** `server/referralRouter.ts:89-127` vs generator `referralRouter.ts:19-27`
**What's wrong:** `recordSignup` looks up `referrals` by `input.code.toUpperCase()` (line 99) and the idempotency/insert then uses `referral.code`. Codes are generated already-uppercase, so this works, but the `z.string().max(16)` input has no charset/min validation, and the elders `join` invite code path (`routers.ts:431`) similarly uppercases. Minor.
**Impact:** Low. No security impact; just unvalidated free-text into a lookup.
**Fix:** Tighten to `z.string().trim().min(3).max(16).regex(/^[A-Z0-9]+$/i)`.

### M4 — `subscription.createCheckout` does not verify caller membership of the elder
**File:** `server/routers.ts:1004-1021`
**What's wrong:** Builds a Lemon Squeezy checkout for any `elderId` without confirming the caller is a member. The custom_data carries `elder_id` + `user_id`, and the webhook later activates Gran+ for that pair.
**Impact:** Low-to-medium. A non-member could initiate a checkout that, if completed, would activate Gran+ on an elder they don't belong to (and create a contributions row for themselves on that elder — feeding the H2 deactivation issue). Requires them to actually pay, so abuse potential is limited, but it's an authorization gap consistent with H1/H2.
**Fix:** Add the membership guard before building the checkout URL.

---

## LOW

### L1 — `.env.production` is committed to git and not git-ignored
**File:** `.env.production` (tracked; `.gitignore` only excludes `.env` and `.env.local`)
**What's wrong:** The file is committed. It currently contains **only** `VITE_CLERK_PUBLISHABLE_KEY`, which is intentionally public (baked into the frontend bundle), so no secret is exposed today.
**Impact:** Low now, but the pattern is risky: anyone later adding a server secret to `.env.production` would commit it. No `sk_…`, R2, Resend, RevenueCat, or Lemon Squeezy secret is hardcoded anywhere in source — all are read from `process.env` with empty-string fallbacks (`server/_core/env.ts`). Good.
**Fix:** Add `.env.production` to `.gitignore` and keep only `.env.example` tracked. (Do not commit secrets to any `.env.*`.)

### L2 — Dead Manus/OpenAI scaffolding (the 3 known tsc errors are here)
**Files:** `server/_core/dataApi.ts:20,28`, `server/_core/imageGeneration.ts:37,45`, `server/_core/voiceTranscription.ts:78,146`
**What's wrong:** Each contains `if (!"https://api.openai.com")` — a non-empty string literal is always truthy, so `!"…"` is always `false`; TS flags the unreachable/always-false branch. These helpers are **not imported anywhere outside `server/_core`** (confirmed by search) — they are leftover Manus scaffolding and the URL-construction is broken anyway (`new URL("webdevtoken.v1.WebDevService/CallApi", "https://api.openai.com")`).
**Impact:** None at runtime (dead code). They are the source of 3 of the 4 known tsc errors and add noise/attack-surface-by-confusion.
**Fix:** Delete `dataApi.ts`, `imageGeneration.ts`, `voiceTranscription.ts` (and any `voiceRouter` example wiring) unless a feature is planned. This also clears 3 tsc errors.

### L3 — Dashboard.tsx tsc error is cosmetic, not a bug
**File:** `client/src/pages/Dashboard.tsx:156`
**What's wrong:** `<Cake … title="…" />` — the lucide-react icon component's typed props don't include `title` in this version, so tsc errors. At runtime the prop is spread to the SVG and simply may not render the tooltip as intended.
**Impact:** None functional; type-check failure only.
**Fix:** Wrap the icon in a `<span title="…">` or use `aria-label`, instead of passing `title` to the icon component.

### L4 — Verbose `console.log` of user/referral identifiers
**Files:** e.g. `server/referralRouter.ts:125,171`, `server/revenueCatRouter.ts` & `lemonSqueezyRoute.ts` activation logs, `server/routers.ts:211,223`, `server/pushRouter.ts:45,67`
**What's wrong:** Logs include numeric user ids, elder ids, referral codes, and Clerk ids. No passwords/tokens/emails are logged (webhook handlers log ids only), so this is informational.
**Impact:** Low — internal id leakage into log aggregation only.
**Fix:** Acceptable for launch; consider trimming to counts in production log level.

---

## Verified-OK (no action needed)

- **Payment cannot be self-granted.** `subscription.setPaid` (`routers.ts:926-938`) and `smartNotify.test` (`1028-1035`) require `ctx.user.role === "admin"`, and that role is only set server-side when `openId === ENV.ownerClerkId` (`server/db.ts:58-60`) — not settable by clients. Elder-admin self-grant was explicitly removed (see comment at line 930).
- **RevenueCat native activation** verifies the entitlement against the RevenueCat REST API before flipping `isPaid` (`revenueCatRouter.ts:157-182`) **and** checks caller membership.
- **RevenueCat webhook** rejects on `Authorization`-header mismatch (`revenueCatRouter.ts:206-219`).
- **Lemon Squeezy webhook** verifies HMAC-SHA256 signature with `timingSafeEqual` before acting (`lemonSqueezyRoute.ts:119-126, 219-222`).
- **careRouter** correctly gates every procedure via `assertMember`/`assertAdmin`, including the `isPaid` (Gran+) check (`careRouter.ts:22-44`); all write paths scope deletes/updates by both `id` and `elderId`.
- **Freemium gating is server-enforced**, not just client: wellbeing/careNotes (`routers.ts:407-414`), moodNote (`routers.ts:665-676`), member limit (`routers.ts:445`), and all care features. Client `CareSchedulePanel` lock is UX-only (comment confirms server enforcement).
- **Cron is crash-safe:** per-elder `try/catch` (`cron.ts:97/370`) so one elder's failure doesn't abort the loop; outer `try/catch` (88/376); `scheduleNext()` is called after each run to keep the daily timer alive even if a run throws inside `runNightlyNotifications` (the await is inside the loop's protected scope).
- **Upload route** authenticates, validates content-type allow-list and 5MB size cap, and namespaces keys by user id (`uploadRoute.ts:14-70`).
- **FK cascades** confirmed in migrations `0010` (elderMedications/medicationLogs/elderAppointments → elders ON DELETE CASCADE) and `0011` (giftLogs → elders ON DELETE CASCADE); elder/account deletes explicitly remove the no-FK tables.
- **`elders.get`, `visits.*`, `planned.list`, `gifts.*`, `pushToken.*`, `notifications.*`, `referral.*`** all correctly scope to membership or `ctx.user.id`.

---

## Fix-first (prioritized)

1. **H1** — Add membership guard to `subscription.status` (PII cross-tenant leak). One-line fix, ship before submission.
2. **H2** — Add membership guard to `subscription.toggleContribution` (lets non-members keep `isPaid` alive after cancellation).
3. **M4** — Add membership guard to `subscription.createCheckout` (same family of gap; cheap).
4. **H3** — Extend `auth.deleteAccount` to delete `pushTokens`, `giftLogs`, `medicationLogs`, `referrals`, `referralSignups` (Apple/GDPR clean delete + stale-push fix).
5. **L1** — git-ignore `.env.production` to prevent future secret commits.
6. **L2 / L3** — Delete the 3 dead `_core` OpenAI files and fix the Dashboard `title` prop to clear all 4 tsc errors.
7. **M2** — Bound/validate `planned.book` dates and `recurringWeeks`.
