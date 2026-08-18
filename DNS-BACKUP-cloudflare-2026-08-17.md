# Cloudflare DNS backup — granwatch.app

Captured 2026-08-17, before switching MX/email from Cloudflare Email Routing to Zoho Mail.
Zone: granwatch.app (Cloudflare account: konnaelf@icloud.com)
Total records at capture time: 17 of 200 used.

Use this to roll back manually in the Cloudflare dashboard (DNS > Records) if anything
goes wrong during the Zoho cutover. Records NOT touched by the Zoho migration are marked
[UNCHANGED]. Records that WILL be edited/replaced are marked [CHANGING].

## Full record list (as of capture)

| # | Name | Type | Content | Proxy | TTL |
|---|------|------|---------|-------|-----|
| 1 | accounts.granwatch.app | CNAME | accounts.clerk.services | DNS only | Auto |
| 2 | clerk.granwatch.app | CNAME | frontend-api.clerk.services | DNS only | Auto |
| 3 | clk2._domainkey.granwatch.app | CNAME | dkim2.a0qfwn8n3pry.clerk.services | DNS only | Auto |
| 4 | clk._domainkey.granwatch.app | CNAME | dkim1.a0qfwn8n3pry.clerk.services | DNS only | Auto |
| 5 | clkmail.granwatch.app | CNAME | mail.a0qfwn8n3pry.clerk.services | DNS only | Auto |
| 6 | granwatch.app (root) | CNAME | 706d1m73.up.railway.app | DNS only | Auto |
| 7 | media.granwatch.app | R2 | granwatch-media (R2 bucket) | Proxied | Auto |
| 8 | www.granwatch.app | CNAME | 706d1m73.up.railway.app | Proxied | Auto |
| 9 | granwatch.app (root) | MX | route3.mx.cloudflare.net | DNS only | Auto |
| 10 | granwatch.app (root) | MX | route2.mx.cloudflare.net | DNS only | Auto |
| 11 | granwatch.app (root) | MX | route1.mx.cloudflare.net | DNS only | Auto |
| 12 | send.granwatch.app | MX | feedback-smtp.eu-west-1.amazonses.com | DNS only | 1 hr |
| 13 | cf2024-1._domainkey.granwatch.app | TXT | see full value below | DNS only | Auto |
| 14 | granwatch.app (root) | TXT (SPF) | "v=spf1 include:_spf.mx.cloudflare.net ~all" | DNS only | Auto |
| 15 | _railway-verify.granwatch.app | TXT | railway-verify=00c0f32b... (Railway domain verification, not fully captured — untouched) | DNS only | Auto |
| 16 | resend._domainkey.granwatch.app | TXT | see full value below | DNS only | 1 hr |
| 17 | send.granwatch.app | TXT (SPF) | "v=spf1 include:amazonses.com ~all" | DNS only | 1 hr |


## Full DKIM values (captured live, for #13 and #16 above)

### cf2024-1._domainkey.granwatch.app (Cloudflare Email Routing DKIM — will likely be removed once Zoho takes over mail)

```
v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiweykoi+o48IOGuP7GR3X0MOExCUDY/BCRHoWBnh3rChl7WhdyCxW3jgq1daEjPPqoi7sJvdg5hEQVsgVRQP4DcnQDVjGMbASQtrY4WmB1VebF+RPJB2ECPsEDTpeiI5ZyUAwJaVX7r6bznU67g7LvFq35yIo4sdlmtZGV+i0H4cpYH9+3JJ78km4KXwaf9xUJCWF6nxeD+qG6Fyruw1Qlbds2r85U9dkNDVAS3gioCvELryh1TxKGiVTkg4wqHTyHfWsp7KD3WQHYJn0RyfJJu6YEmL77zonn7p2SRMvTMP3ZEXibnC9gz3nnhR6wcYL8Q7zXypKTMD58bTixDSJwIDAQAB
```

### resend._domainkey.granwatch.app — DO NOT TOUCH (serves Resend transactional/notification emails on send.granwatch.app)

```
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCx96b2j/tiU2lclaOWyr8cvPXpQf0hBvnsgt0YQU2hfpXpdjkhMdSOC2JiUcKKpZZc0eSabTy/28EO/JOrfZLHVBGuKjmjdIznKoErIYu8dnHBzZnedMxzklvJ38VEHrXAnbd9pIJpgESmW5eIm//hY8ZyPZyKKIEIVKs/R/icPQIDAQAB
```

## Migration plan (what will change vs. what stays)

**Stays untouched (Resend/transactional email — critical, do not break):**
- send.granwatch.app MX → feedback-smtp.eu-west-1.amazonses.com
- send.granwatch.app TXT (SPF) → "v=spf1 include:amazonses.com ~all"
- resend._domainkey.granwatch.app TXT (DKIM)

**Stays untouched (app infra):**
- accounts/clerk/clk2/clk/clkmail records (Clerk auth)
- root CNAME → Railway
- www CNAME → Railway
- media.granwatch.app R2
- _railway-verify TXT

**Will be added (Zoho Mail setup):**
- Zoho domain verification TXT/CNAME (value TBD once retrieved from Zoho admin)
- Zoho MX records (mx.zoho.com / mx2.zoho.com / mx3.zoho.com, priorities 10/20/50 — to confirm exact values from Zoho admin)
- Zoho DKIM TXT record (to retrieve from Zoho admin)
- Root SPF TXT updated to add Zoho's include, e.g. include:zoho.com or include:zoho.eu (to confirm from Zoho admin — depends on data center)

**Will likely be removed once Zoho MX is live and verified working:**
- route1/2/3.mx.cloudflare.net MX records (Cloudflare Email Routing)
- cf2024-1._domainkey.granwatch.app TXT (Cloudflare Email Routing DKIM)
- Cloudflare's include in root SPF (include:_spf.mx.cloudflare.net) — only after confirming Zoho mail flow works, to avoid a gap

**Note on hello@:** currently a Cloudflare Email Routing forward. Must be recreated as a Zoho alias/forward pointing to konstand@granwatch.app (or wherever Konna wants it) once the mailbox exists, so it keeps working after Cloudflare Email Routing MX is removed.


## ✅ MIGRATION COMPLETE — verified 2026-08-18

**Zoho Mail cutover finished and fully verified.** What happened, in order:

- Cloudflare Email Routing removed: route1/2/3.mx.cloudflare.net MX records deleted, cf2024-1._domainkey TXT deleted, Cloudflare's `include:_spf.mx.cloudflare.net` removed from root SPF.
- Zoho DNS records added to the granwatch.app zone: 3 MX records (mx.zoho.com prio 10, mx2.zoho.com prio 20, mx3.zoho.com prio 50), root SPF TXT `v=spf1 include:zohomail.com ~all`, DKIM TXT `zmail._domainkey.granwatch.app`. Pre-existing `zoho-verification` TXT record remained in place throughout.
- **Zoho's own "Verify all records" check returned "All the records have been verified successfully"** — MX/SPF/DKIM cutover is confirmed by Zoho, not just by manual DNS inspection.
- Record count check: 18 of 200 used (13 remaining after the 5 Cloudflare Email Routing records were removed, +5 new Zoho records = 18) — matches expected math.
- **Resend transactional email records confirmed 100% untouched** (verified via Cloudflare's DNS search filter, not scrolling — the records table has a rendering bug where scroll does nothing; use the "Search DNS Records" field instead): send.granwatch.app MX, send.granwatch.app TXT (SPF), resend._domainkey.granwatch.app TXT (DKIM) all still present and unmodified. GranWatch's notification/transactional emails were never at risk.
- **konstand@granwatch.app** mailbox confirmed active (Super Administrator role).
- **hello@granwatch.app** created as an alias on the konstand@granwatch.app mailbox (Zoho Admin Console → Users → Mailbox Settings → Email Alias → Add).
- **Live send/receive test passed end-to-end**: sent a test email from d274bg@gmail.com to hello@granwatch.app, confirmed it arrived in the konstand@granwatch.app Zoho inbox (mail.zoho.com), addressed to the hello@ alias. Full loop verified working.

**Other records confirmed untouched throughout (never at risk):** accounts/clerk/clk2/clk/clkmail (Clerk auth), root + www CNAMEs (Railway), media.granwatch.app (R2), _railway-verify TXT.

This file's earlier sections above are the pre-migration snapshot/plan and are kept for rollback reference only — the migration itself is done, live, and verified as of 2026-08-18.
