# Lemon Squeezy — Setup Guide (2 steps, ~15 min)

Two things to do in the LS dashboard before Gran+ subscriptions go live:

1. **Publish the existing ZAR variant** (it's stuck in "pending")
2. **Add 7 regional pricing variants**
3. **Complete KYC** (if payout identity check isn't done)

---

## Step 1 — Publish the ZAR Variant

Your Gran+ product exists but the default variant is in **Pending** status, which means it's not active.

1. Go to → [app.lemonsqueezy.com/products/1072800](https://app.lemonsqueezy.com/products/1072800)
2. Click the **"Default"** variant
3. Find the **Status** dropdown → change from **Pending** → **Published**
4. Save

That's it — your ZAR R79/month variant will go live.

---

## Step 2 — Add 7 Regional Pricing Variants

For each variant below, go to the Gran+ product → **+ Add Variant**.

Use these exact values:

| Variant Name      | Price  | Currency | Interval |
|-------------------|--------|----------|----------|
| Monthly – USD     | $4.99  | USD      | Monthly  |
| Monthly – GBP     | £3.99  | GBP      | Monthly  |
| Monthly – EUR     | €4.49  | EUR      | Monthly  |
| Monthly – BRL     | R$14.99| BRL      | Monthly  |
| Monthly – INR     | ₹149   | INR      | Monthly  |
| Monthly – LOW     | $2.99  | USD      | Monthly  |
| Monthly – ZAR     | R79    | ZAR      | Monthly  |

> **Note:** "Monthly – ZAR" is the same as the Default variant you just published.
> You can either rename Default → "Monthly – ZAR" or leave it as-is.
> "Monthly – LOW" is for lower-income regions (Southeast Asia, Africa ex-ZA, etc.).

After creating each variant, copy its **Variant ID** from the URL
(e.g. `app.lemonsqueezy.com/products/1072800/variants/XXXXXXX`)
and paste them into this table:

| Variant      | LS Variant ID |
|--------------|---------------|
| ZAR (Default)| 1681701       |
| USD          |               |
| GBP          |               |
| EUR          |               |
| BRL          |               |
| INR          |               |
| LOW          |               |

Then send me the IDs and I'll wire them into the geolocation pricing code immediately.

---

## Step 3 — Complete KYC (Identity Verification)

This is required before Lemon Squeezy will pay out your earnings.

1. Go to → [app.lemonsqueezy.com/settings/payouts](https://app.lemonsqueezy.com/settings/payouts)
2. Look for a **"Verify identity"** or **"Complete KYC"** banner
3. Follow the Stripe Identity flow (photo ID + selfie, ~5 min)
4. Under **Payout method** → add your South African bank account

> If you already see a bank account and no KYC banner, you're done.

---

## What Happens Next (I Handle This)

Once you give me the 7 variant IDs, I will:
- Write `utils/geolocation.ts` (IP → country → pricing tier lookup)
- Update `GranPlusModal.tsx` to show localised price and use correct variant ID at checkout
- Add `LS_VARIANT_ID_USD`, `LS_VARIANT_ID_GBP`, etc. to Railway env vars
- Push to GitHub → auto-deploys

The whole thing will be done before you finish your tea.
