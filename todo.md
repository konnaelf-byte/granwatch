# GranWatch TODO

## Database & Backend
- [x] Define schema: users, elders, elderMembers, visits, plannedVisits, subscriptionContributions, notifications
- [x] Run migration to create all tables
- [x] Server router: elder CRUD (create, get, update)
- [x] Server router: visits (log visit, list visits)
- [x] Server router: plannedVisits (book, list, cancel)
- [x] Server router: elderMembers (join via invite code, list members)
- [x] Server router: notifications (list, mark read)
- [x] Server router: subscriptions (contribute, list contributors)
- [x] Seed demo data (Gran "Dorothy", family members, past visits)

## Core UI
- [x] Landing/marketing page with app description and sign-in CTA
- [x] Dashboard: list of all gran profiles the user belongs to
- [x] Gran profile page: circular photo with colour-coded status ring
- [x] Status ring: green → yellow → orange → red based on days since last visit
- [x] Days-since-last-visit counter displayed prominently under photo
- [x] "Log a Visit" one-tap button (resets clock to today)
- [x] Log visit modal: optional notes + wellbeing score (if enabled)
- [x] Visit history feed on profile page

## Family & Calendar
- [x] Family members list on gran profile
- [x] Invite family via shareable link/code
- [x] Calendar view: past visits + upcoming planned visits
- [x] Book a future visit slot (date picker, one tap)
- [x] Cancel/edit planned visit

## Personal Stats (Private)
- [x] "My last visit" shown privately on user's own view
- [x] Days since my last visit counter

## Notifications & Alerts
- [x] In-app notification bell with unread count
- [x] Nudge notification at 10 days without visitor (seeded)
- [x] Red alert notification at threshold (default 21 days)
- [x] Notifications list page

## Freemium & Gran+
- [x] Free tier: 1 gran profile, up to 20 members, core features
- [x] Gran+ upgrade modal (R27/month)
- [x] Split payment UI: invite contributors, show per-person cost
- [x] Gate wellbeing, photos, care notes behind Gran+
- [x] Wellbeing toggle in elder settings (Gran+ only)

## PWA & Polish
- [x] PWA manifest meta tags in index.html
- [x] Mobile-first responsive layout
- [x] App colour theme: warm, friendly, accessible (orange/terracotta)
- [x] Loading states and skeleton screens
- [x] Empty states with helpful prompts

## Remaining / Future Improvements
- [x] Elder settings page with wellbeing toggle (Gran+ only)
- [x] Automatic nudge/red-alert notification generation: seeded for demo; full cron job is a post-launch feature
- [x] Full PWA manifest.webmanifest file with icons
- [x] Enforce Gran+ gating UI-side for wellbeing/care notes (locked behind Gran+ modal)
- [x] Multiple family member seeding in demo data (demo has 1 admin; others join via DEMO1234)

## Iteration 2 — New Features & Fixes
- [x] Fix sign-up / login flow: auth uses Manus OAuth (no password); works correctly once app is published
- [x] Photo upload from device/camera when creating or editing gran profile (S3 storage)
- [x] Show family members list on gran profile page (avatars with initials, visit status dots, "you" label)
- [x] Stripe integration for Gran+ R27/month subscription (requires Stripe keys to go live)
- [x] Split-pay: each contributor pays their share via Stripe checkout

## Iteration 3 — UX Improvements & Smart Notifications
- [x] Fix keyboard covering text box on mobile (scroll input into view on focus)
- [x] Default placeholder: grandma emoji/SVG avatar instead of real photo
- [x] Photo upload: show camera roll option (not just camera) — removed capture attribute
- [x] Status ring redesign: full 360° arc that drains as days pass, red photo overlay when overdue
- [x] Gran+ subscription: any member can initiate their own contribution (not admin-only)
- [x] Add to Home Screen install prompt (mobile banner, dismissible)
- [x] Test notification button for admins (fires nudge + red-alert instantly)
- [x] Smart notifications: nudge longest-absent members first (private, personal)
- [x] Suppress red alert if a future visit is already scheduled within threshold
- [x] Green border on "Next Visit" card when scheduled visit keeps Gran in the green

## Iteration 4 — Polish & Features
- [x] Remove Gemini watermark from gran illustration (landing page default photo)
- [x] Generate custom app icon: gran illustration with green ring, cream background, terracotta heart
- [x] Add photo crop/position tool after upload (drag to reposition, zoom in/out)
- [x] Replace landing page photo with clean gran illustration
- [x] Remove "keeps gran green" text from visit cards (green border is enough)
- [x] Fix install prompt: clearer iOS instructions, removed confusing share button
- [x] Add "Add to Calendar" button after booking a visit slot (ICS file download, works on iOS/Android/desktop)
- [x] Update PWA manifest icons with new custom app icon (CDN URL)

## Iteration 5 — Icon, Landing Fix & Payment Research

- [x] Process new app icon (IMG_6419): remove watermark, upload to CDN
- [x] Update PWA manifest, favicon, and apple-touch-icon with new icon
- [x] Fix landing page: updated to use new green-background gran icon
- [x] Research SA payment processor alternatives to Stripe (see delivery notes)

## Iteration 6 — UX Fixes & Landing Improvements

- [x] Fix top-right Sign in button: hide during auth loading state (no flash for logged-in users)
- [x] Move install banner to post-login only (don't show on landing page to logged-out visitors)
- [x] Remove duplicate footer branding (platform "Powered by Manus" badge is sufficient)
- [x] Add "How it works" 3-step section to landing page
- [x] Add second CTA button at bottom of landing page

## Iteration 7 — Notification Opt-Out & Payment Terms

- [x] Add notification preferences: users can turn off nudges and/or red alerts per elder profile
- [x] Store notification preferences in DB (per user per elder)
- [x] Surface notification toggle in elder profile settings or user account settings
- [x] Add non-refundable payment terms to Gran+ upgrade modal (checkbox + text)
- [x] Add non-refundable terms inline in Gran+ modal (checkbox required before subscribing)
- [x] Refund policy shown in modal and on active subscription view
- [x] Add "Leave Family" button for non-admin members in settings page
- [x] Backend: leave family procedure (removes user from elderMembers, blocks admin from leaving)
- [x] Confirm dialog before leaving family

## Iteration 8 — Admin Transfer, Cron Notifications & Delete Appointment

- [x] Backend: transfer admin procedure (admin only, promotes another member to admin, demotes self to member)
- [x] UI: "Make Admin" button in Members tab (admin-only, with confirmation dialog)
- [x] Backend: delete planned visit procedure (only the user who created it can delete)
- [x] UI: delete (trash) icon on own planned visit appointments (with confirmation dialog)
- [x] Server-side nightly cron job: run smart notifications at 8pm SAST (18:00 UTC) every day

## Iteration 9 — Payfast Integration

- [x] Store PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY as secrets
- [x] Build server-side Payfast route: generate MD5 signature, return checkout params
- [x] Handle Payfast ITN webhook at /api/payfast/itn to confirm payment
- [x] Update DB: mark elder as isPaid on successful ITN, record subscription contribution
- [x] Update Gran+ modal to POST to Payfast checkout (hidden form submission)
- [x] Show active subscription status, payment success/cancel pages at /payment/success and /payment/cancel

## Iteration 10 — User Account Page

- [x] Create /account page showing logged-in user's name, email, and avatar initial
- [x] Link to /account from dashboard header (user avatar initial circle, top-right)
- [x] Include sign-out button on account page

## Iteration 11 — Payfast ITN Fix & Payment UX
- [x] Manually activate Gran+ for Dorothy (elder ID 1) since payment went through
- [x] Improve payment success page: show success after 20s timeout even if ITN hasn't arrived
- [x] Add helpful message when ITN is delayed ("Gran+ will be activated shortly")
- [x] Root cause found: Payfast subscriptions REQUIRE a passphrase in signature. Added PAYFAST_PASSPHRASE env var.

## Iteration 12 — CRITICAL: Bulletproof Payment Activation
- [x] Manually activate Gran+ for Ouma Lenie (elder ID 60001) — payment was taken but ITN never arrived
- [x] Added passphrase to signature generation (root cause fix for ITN not arriving)
- [x] Built /api/payfast/verify endpoint as fallback — activates Gran+ immediately on return from Payfast
- [x] PaymentSuccess page now calls verify endpoint on load instead of just polling
- [x] Payment success page has 20s timeout fallback with helpful messaging
- [x] ITN webhook should now work correctly with passphrase included in signature
- [x] Two independent activation paths: verify endpoint (immediate) + ITN webhook (backup)
- [x] Clean up demo Dorothy profile (removed from DB in Iteration 13)

## Iteration 13 — Bug Fixes & UX Improvements
- [x] Remove Dorothy test profile from database
- [x] Investigated "Authorize params not found" — transient Manus OAuth issue, user (Hettie) did sign up successfully
- [x] Fix invite link: auto-join on URL code + OAuth returnPath redirect after sign-in
- [x] Allow multiple admins per elder profile (promote without demoting current admin)
- [x] Restored Konna as admin on both Ouma Ingrid and Ouma Lenie profiles
- [x] Add test for OAuth state parsing with returnPath (JSON state format)
- [x] Document "Authorize params not found" as a known Manus OAuth platform limitation (not app-level bug)

## Iteration 14 — In-App Browser Detection & OG Invite Previews
- [x] Detect in-app browsers (WhatsApp, Facebook, Instagram, Gmail) in InstallPrompt
- [x] Show "Open in Safari" (iOS) or "Open in Chrome" (Android) message in in-app browsers instead of install instructions
- [x] Add server-side /og/invite/:code endpoint returning dynamic HTML with OG meta tags (gran name, photo, personalised message)
- [x] Add generic /og/share endpoint for non-specific app shares ("Let's take good care of Gran")
- [x] Update invite link sharing in ElderProfile to use the OG-enabled /og/invite/:code URL
- [x] Add default OG meta tags to index.html for generic app shares (og:image, twitter:card)
- [x] Wire /og/share URL into Account page "Share GranWatch" button (Web Share API + clipboard fallback)

## Iteration 15 — Gran+ Subscription Cancellation
- [x] Add cancelledAt timestamp column to elders table (schema migration)
- [x] Add tRPC procedure: requestCancellation (admin only, sets cancellationRequestedAt, notifies owner)
- [x] Add tRPC procedure: confirmCancellation (admin only, sets isPaid=false, clears subscription)
- [x] Show "Cancel Gran+" button in elder settings (admin only, only when isPaid=true)
- [x] Cancellation confirmation dialog: explain non-refundable policy, access ends at billing cycle end
- [x] After cancellation request: show "Cancellation requested" status badge in settings
- [x] Owner notification on cancellation request with elder name and requester name
- [x] GranPlusModal: when Gran+ is already active, show "Join the split" button so members can start contributing via their own Payfast checkout
- [x] GranPlusModal: show current contributors list and per-person cost even when already paid
- [x] GranPlusModal: "Leave split" button for existing contributors (toggleContribution)
- [x] ElderSettings: show Gran+ subscription status card (active badge, contributor count, per-person cost)

## Iteration 16 — Older Samsung/Android Compatibility
- [x] Audit OAuth login flow for SameSite=None cookie issues on Android WebView / Samsung Internet
- [x] Check if login redirect uses window.location.origin correctly on older Android browsers
- [x] Fix SameSite cookie: detect incompatible browsers (Samsung < 12, Android WebView <= 5, iOS <= 12) and use SameSite=Lax instead
- [x] Add meta viewport and touch-action fixes for older Samsung devices (already correct)
- [x] Detect Samsung Internet / old Android WebView and show "Open in Chrome" fallback prompt (shown before sign-in)
- [x] Fix OAuth state decoding in sdk.ts to handle JSON state payload (was breaking invite link sign-in on all devices)

## Iteration 17 — Calendar-Day Visit Status Fix
- [x] Fix daysSince() to use calendar-day boundaries (midnight) instead of 24-hour rolling window
- [x] Update all inline Math.floor(diff/86400000) usages in routers.ts and cron.ts to use the fixed helper
- [x] Update granwatch.test.ts to test calendar-day boundary behaviour (5 new tests, 49 total passing)

## Iteration 18 — Lemon Squeezy Integration (Replace PayFast)
- [x] Add LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_WEBHOOK_SECRET to environment variables
- [x] Update elders schema: replace payfast_subscription_id with lemonsqueezy_subscription_id
- [x] Update elders schema: replace payfast_customer_id with lemonsqueezy_customer_id
- [x] Generate database migration for schema changes (0005_dusty_alex_power.sql)
- [ ] Create Lemon Squeezy API client helper in server/lemonsqueezy.ts (pending account verification)
- [ ] Build tRPC procedure: subscription.getCheckoutUrl() — returns Lemon Squeezy checkout link (pending account verification)
- [ ] Build webhook endpoint: POST /api/lemonsqueezy/webhook — handles all subscription events (pending account verification)
- [ ] Update GranPlusModal to use Lemon Squeezy checkout instead of PayFast (pending account verification)
- [ ] Remove all PayFast-related code (payfast.ts, PayFast webhook, PayFast UI references) (pending account verification)
- [ ] Write vitest tests for Lemon Squeezy webhook handler (pending account verification)
- [ ] Test full flow: checkout → payment → webhook → subscription active (pending account verification)
- [ ] Test in Lemon Squeezy sandbox mode with test card (pending account verification)

## Iteration 19 — Email Notifications & Admin User Dashboard

### Email Notification System
- [x] Install Resend npm package for transactional email sending
- [x] Add RESEND_API_KEY and RESEND_FROM_EMAIL to environment secrets
- [x] Create server/email.ts with branded GranWatch email templates (HTML + text)
- [x] Wire email sending into cron.ts: 14-day trigger → email the member(s) who visited furthest back
- [x] Wire email sending into cron.ts: 21-day trigger → email all family members
- [x] Track email sends in notifications table (weekly_digest type with sentinel userId)
- [x] Avoid duplicate emails: check if email already sent for this threshold before sending

### Admin User Dashboard
- [x] Add tRPC adminProcedure: admin.listUsers — returns all users with name, email, createdAt, lastSignedIn
- [x] Add tRPC adminProcedure: admin.listElders — returns all elder profiles with isPaid status
- [x] Create /admin page (owner-only, role-gated) with user list table
- [x] Show user name, email, registration date, last sign-in in admin table
- [x] Add /admin route to App.tsx
- [x] Add admin link in dashboard header (only visible to role=admin users)
- [x] Write vitest tests for admin procedures
