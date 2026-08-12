/**
 * Server-rendered content pages — the SEO/GEO moat.
 *
 * WHY SERVER-RENDERED: the app is an SPA, but crawlers and AI assistants
 * (ChatGPT/Perplexity citation engines) reward plain, fast, schema-marked
 * HTML. These routes register BEFORE the static/SPA catchall, so they win.
 * Zero interaction with app code — purely additive.
 *
 * Pages: /guides (index), /guides/:slug (articles), /faq, /compare/family-group-chat,
 * /sitemap.xml (shadows the static one to include these pages), /robots.txt.
 *
 * Content source: Marketing Masterplan + Asset Pack Round 1 (2026-08-12).
 * Stats verified: WHO Commission on Social Connection (June 2025),
 * US Surgeon General advisory (2023), Age UK. Keep attributions intact.
 */

import type { Express } from "express";

const APP_URL = "https://granwatch.app";

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(opts: {
  title: string;
  description: string;
  path: string;
  bodyHtml: string;
  schema?: object;
}): string {
  const canonical = `${APP_URL}${opts.path}`;
  const schemaTag = opts.schema
    ? `<script type="application/ld+json">${JSON.stringify(opts.schema)}</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title}</title>
<meta name="description" content="${opts.description}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${opts.title}">
<meta property="og:description" content="${opts.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${APP_URL}/og-default.png">
<meta property="og:type" content="article">
<link rel="icon" href="/icon-192.png">
${schemaTag}
<style>
  :root{--bg:#FAF7F0;--ink:#2d2a26;--muted:#6b6459;--green:#16a34a;--red:#dc2626;--card:#fff}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  header{padding:20px 24px;border-bottom:1px solid #e8e2d8}
  header a{color:var(--ink);text-decoration:none;font-weight:700;font-size:20px}
  header a span{color:var(--green)}
  main{max-width:720px;margin:0 auto;padding:32px 24px 64px}
  h1{font-size:32px;line-height:1.25;margin:0 0 8px}
  h2{font-size:22px;margin:36px 0 8px}
  p,li{color:var(--ink)}
  .sub{color:var(--muted);font-size:15px;margin-bottom:28px}
  a{color:var(--green)}
  .cta{background:var(--card);border:1px solid #e8e2d8;border-radius:16px;padding:24px;margin:40px 0 0}
  .cta h3{margin:0 0 8px;font-size:19px}
  .cta p{margin:0 0 16px;font-size:15px;color:var(--muted)}
  .btn{display:inline-block;background:var(--green);color:#fff !important;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600}
  .ring{display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:6px;vertical-align:middle}
  .g{background:var(--green)} .r{background:var(--red)} .y{background:#eab308}
  footer{max-width:720px;margin:0 auto;padding:24px;color:var(--muted);font-size:13px;border-top:1px solid #e8e2d8}
  footer a{color:var(--muted);margin-right:14px}
  blockquote{border-left:3px solid var(--green);margin:20px 0;padding:4px 0 4px 16px;color:var(--muted)}
  .qa h2{font-size:19px;margin-top:28px}
  table{border-collapse:collapse;width:100%;font-size:15px;margin:16px 0}
  td,th{border:1px solid #e8e2d8;padding:10px 12px;text-align:left;vertical-align:top}
  th{background:#f3eee4}
</style>
</head>
<body>
<header><a href="${APP_URL}">Gran<span>Watch</span></a></header>
<main>${opts.bodyHtml}</main>
<footer>
  <a href="${APP_URL}">Home</a><a href="/guides">Guides</a><a href="/faq">FAQ</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a>
  <div style="margin-top:8px">GranWatch — see when Gran was last visited. She doesn't need a phone.</div>
</footer>
</body>
</html>`;
}

const CTA = `<div class="cta">
  <h3>See when Gran was last visited — she doesn't need a phone</h3>
  <p>A colour ring on Gran's photo the whole family sees: <span class="ring g"></span>green when someone's visited recently, <span class="ring r"></span>red when nobody has. One tap logs a visit. Free for the whole family.</p>
  <a class="btn" href="${APP_URL}">Start your family's ring →</a>
</div>`;

// ─── Articles ─────────────────────────────────────────────────────────────────

interface Article {
  title: string;
  description: string;
  datePublished: string;
  bodyHtml: string;
}

const ARTICLES: Record<string, Article> = {
  "how-often-should-you-visit-elderly-parents": {
    title: "How often should you visit your elderly parents? An honest answer.",
    description:
      "There's no magic number — but there is a magic pattern. What research actually says about visit frequency, elder loneliness, and the real problem: nobody's counting.",
    datePublished: "2026-08-12",
    bodyHtml: `
<h1>How often should you visit your elderly parents? An honest answer.</h1>
<p class="sub">If you searched this question, start with this: the fact that you're asking already puts you ahead of most families. Nobody googles this out of neglect. They google it at 11pm, out of guilt, usually after realising it's been longer than they thought.</p>

<h2>The short answer</h2>
<p>There is no magic number — but there is a magic <em>pattern</em>: <strong>regularity beats frequency.</strong> A visit every single week that actually happens does more for an older person's wellbeing than daily intentions that don't. Research on elder loneliness consistently shows that <em>predictable</em> social contact — something to look forward to — is what protects against isolation, not raw visit counts.</p>
<p>As a practical baseline, most geriatric-care professionals converge on:</p>
<ul>
<li><strong>Living independently and well:</strong> a meaningful visit every 1–2 weeks, with phone or video contact in between.</li>
<li><strong>Declining health or recently widowed:</strong> weekly at minimum — this is when isolation accelerates.</li>
<li><strong>In assisted living or frail:</strong> short visits, more often, beat long visits rarely. Twenty minutes twice a week outperforms a monthly marathon Sunday.</li>
</ul>

<h2>Why it matters more than most families realise</h2>
<p>This isn't sentimentality; it's epidemiology. The <strong>WHO declared loneliness a global health concern, linking it to an estimated 100 deaths every hour</strong> worldwide (WHO Commission on Social Connection, 2025). The <strong>US Surgeon General's advisory found that chronic loneliness and social isolation increase dementia risk in older adults by approximately 50%</strong>, and that lacking social connection can be as deadly as smoking up to 15 cigarettes a day. Among lonely older people in the UK, <strong>41% told Age UK their television or pet is their main form of company.</strong></p>
<p>A visit is not a nicety. For an isolated elder, it is preventive medicine that no pill replicates.</p>

<h2>The real problem is not how often. It's <em>who's counting.</em></h2>
<p>Here is the thing nobody says out loud: in most families, <strong>no one actually knows</strong> when Mom was last visited. Everyone assumes someone else went. The siblings each carry a private, slightly wrong picture of how covered she is — until a health scare compares notes for them.</p>
<p>Three questions worth asking your family group chat today:</p>
<ul>
<li>When was the last time someone <em>physically</em> visited — not called, visited?</li>
<li>Who was it? (If everyone answers "I thought it was you," that's your answer.)</li>
<li>Would you actually know if three weeks passed with nobody going?</li>
</ul>
<p>Most families fail question three. Not from lack of love — from lack of <em>visibility</em>.</p>

<h2>What helps (from families who've solved it)</h2>
<ul>
<li><strong>Make visits visible to everyone.</strong> A shared record — even a paper calendar on Mom's fridge — ends the assumption problem. (This is exactly why we built <a href="${APP_URL}">GranWatch</a>: a colour ring on Gran's photo the whole family sees — green when someone's visited recently, red when nobody has. One tap logs a visit; Gran herself needs no phone. Families tell us the arguing stops before the visiting even increases.)</li>
<li><strong>Anchor visits to fixtures, not intentions.</strong> "Every Saturday after the shops" survives; "more often" doesn't.</li>
<li><strong>Rotate fairly among siblings — including the overseas ones.</strong> Distance changes your <em>role</em>, not your relevance: the distant sibling can own the calls, the admin, or covering the family's tools, while local siblings own presence.</li>
<li><strong>Count what counts.</strong> A 20-minute cup of tea where you actually sit down is a visit. Dropping groceries at the door is love, but it isn't company.</li>
</ul>

<h2>If you feel guilty right now</h2>
<p>Guilt is information, not a verdict. It's telling you the current pattern doesn't match your values — which is fixable this week, not something to atone for. Book one visit, put it on a shared record, and let the next one be <em>scheduled</em> rather than remembered. The families that do best aren't the ones that never slip. They're the ones that can <em>see</em> when they're slipping — and quietly fix it before it becomes five months.</p>
${CTA}`,
  },

  "guilt-about-not-visiting-elderly-parents": {
    title: "I feel guilty for not visiting my elderly mother. What actually helps.",
    description:
      "Caregiver guilt is nearly universal — and mostly useless in the form it arrives. Here's how to convert it into a pattern your family can keep, without shame.",
    datePublished: "2026-08-12",
    bodyHtml: `
<h1>I feel guilty for not visiting my elderly mother. What actually helps.</h1>
<p class="sub">Written for everyone who has done the silent calendar math — "when was I actually last there?" — and not liked the answer. That includes the person who built this site.</p>

<h2>First, the truth about the guilt</h2>
<p>Guilt about not visiting an ageing parent is one of the most common feelings adult children report — and it's <em>heaviest</em> in the people who care most. Neglectful children don't lie awake doing calendar math. So treat the guilt as evidence of love with a logistics problem, not evidence of a character flaw.</p>
<p>But left raw, guilt does something perverse: it makes visiting <em>harder</em>. The longer it's been, the more the visit feels like an admission, so it gets postponed again. Psychologists call this avoidance loop out for a reason — the way to break it is never "feel worse." It's "make the next step smaller."</p>

<h2>What doesn't work</h2>
<ul>
<li><strong>Grand resolutions.</strong> "From now on, every week" collapses by week three and manufactures fresh guilt.</li>
<li><strong>Compensating with money.</strong> Groceries delivered and bills covered are real love — but the WHO links loneliness itself to around 100 deaths an hour globally. Money solves the errands; it cannot sit in the chair across from her.</li>
<li><strong>Guilt-tripping siblings.</strong> Accusation produces defence, not visits. Nobody has ever been shamed into a warmer relationship with their mother.</li>
</ul>

<h2>What works</h2>
<ul>
<li><strong>One small visit, this week, unannounced ambition.</strong> Twenty minutes and a rusk. The visit that breaks the avoidance loop is deliberately modest — its job is to reset the counter, not to atone.</li>
<li><strong>A fixture, not a frequency.</strong> Tie the visit to something that already happens: after the Saturday shop, before church, the first Sunday of the month. Fixtures survive busy seasons; intentions don't.</li>
<li><strong>Shared visibility instead of private bookkeeping.</strong> Most family guilt is actually <em>uncertainty</em> — nobody knows who went last, so everyone assumes the worst about themselves. A shared record the whole family can see (this is what <a href="${APP_URL}">GranWatch</a> does with a simple green/red ring on Gran's photo — no phone needed for her) replaces the fog with a fact. Families consistently tell us the relief comes <em>before</em> the visiting even increases: the ring is green, someone went, you can stop wondering.</li>
<li><strong>Let the distant members carry a different weight.</strong> If you're overseas or far away, your guilt needs a different outlet: own the weekly call, the doctor's-appointment admin, or cover the family's tools. Presence has understudies; absence of any role doesn't.</li>
</ul>

<h2>The reframe that sticks</h2>
<blockquote>Guilt counts what you didn't do. A family that can see itself counts what it did.</blockquote>
<p>You cannot retroactively visit. You can make the next three weeks visible, shared, and slightly easier than the last three. That's the entire fix — everything else is decoration.</p>
${CTA}`,
  },

  "siblings-wont-help-caring-for-elderly-parents": {
    title: "My siblings won't help with our elderly parents. A fair system that works.",
    description:
      "The sibling care fight is almost never about love — it's about invisible labour. A practical rotation system, the script for the hard conversation, and the tool that ends the scorekeeping.",
    datePublished: "2026-08-12",
    bodyHtml: `
<h1>My siblings won't help with our elderly parents. A fair system that works.</h1>
<p class="sub">"I thought YOU went last week" has ended more sibling relationships than inheritance has. Here's how families actually get out of it.</p>

<h2>Why this fight is almost never about love</h2>
<p>In most families one sibling — usually the nearest, often a daughter — quietly becomes the default carer. The others aren't heartless; they genuinely don't <em>see</em> the labour, because care work is invisible by nature. The carer keeps score privately, resentment compounds, and by the time it surfaces it comes out as an accusation, which produces defensiveness instead of help.</p>
<p>The fix is not a bigger confrontation. It's making the work <em>visible</em> before it becomes ammunition.</p>

<h2>The system: visible, rotating, role-based</h2>
<ul>
<li><strong>1. Separate the roles.</strong> Presence (visits), logistics (appointments, meds, money admin), and connection (calls, photos, keeping Mom's spirits up) are three different jobs. The overseas brother can't visit — he can absolutely own logistics and connection. "Help" stops meaning only "show up" and suddenly everyone can hold a role.</li>
<li><strong>2. Make presence visible to everyone at once.</strong> This is the step families skip, and it's the one that works. When every sibling can see the same record of when Mom was last visited — like the green/red ring on her photo in <a href="${APP_URL}">GranWatch</a>, which the whole family sees update in real time — two things happen: the carer's work finally shows, and the gaps stop being deniable. No spreadsheet, no nagging: one tap when anyone visits. Families tell us the scorekeeping arguments end within weeks, because <em>the ring answers before anyone has to ask.</em></li>
<li><strong>3. Rotate with fixtures, not fairness debates.</strong> "Thabo has first-Sunday, I have third-Saturday, Lien calls Wednesdays" beats "we should share this more equally" every time. Fixtures survive; sentiments don't.</li>
<li><strong>4. Review monthly, kindly, with the record open.</strong> Ten minutes on the family call: look at the visits that actually happened, thank whoever carried the month, and adjust. Gratitude spoken over a visible record does what a year of hinting never will.</li>
</ul>

<h2>The script for the hard conversation</h2>
<blockquote>"I'm not angry, and I don't want to fight about the past. I've been carrying more of Mom's care than I can keep carrying, and I don't think you can see it — honestly, half of it even I forget. Can we put it somewhere we all see it, split the roles, and check in once a month? I'd rather share the load now than resent you at her funeral."</blockquote>
<p>Send it as a voice note if writing feels cold. The magic words are "I don't think you can <em>see</em> it" — they replace the accusation with the actual problem.</p>

<h2>If a sibling still won't engage</h2>
<p>Some won't, and you cannot make them. What the visible record changes is <em>your</em> burden: the resentment of carrying alone is halved when the carrying is at least witnessed — by the rest of the family, and by Mom's ring turning green because of you. Protect your own capacity, accept imperfect siblings, and let the record quietly tell the truth you're tired of saying.</p>
${CTA}`,
  },
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS: Array<{ q: string; a: string }> = [
  { q: "Does Gran need a phone or app for GranWatch to work?",
    a: "No. Gran needs nothing — no phone, no app, no button to press. GranWatch is for the family around her: relatives log visits and see the status ring. That's what makes it different from check-in apps and alert pendants, which all require the elderly person to operate something." },
  { q: "What is the status ring?",
    a: "A colour-coded ring around Gran's photo that the whole family sees at once. Green means someone visited recently, yellow means it's been a while, red means nobody has been. Any family member logs a visit with one tap and the ring resets to green for everyone." },
  { q: "Is GranWatch free?",
    a: "The core is free forever: the status ring, logging visits, inviting the whole family, and alerts. Gran+ is an optional upgrade (R79/month on the web, $2.99/month on the App Store) that adds care routines like medication tracking, appointments, custom counters, visit photos and mood tracking. One subscription covers the entire family." },
  { q: "Is this surveillance of my grandmother?",
    a: "The opposite. Nothing tracks Gran — no camera, no wearable, no location. The only thing recorded is that a family member chose to visit. GranWatch watches the family, and only the thing families are proudest to have on record." },
  { q: "We already have a family WhatsApp group. Why would we need this?",
    a: "The group chat tells you everything except the one thing: when someone last physically visited. Scroll back and try to work it out — that scroll is what the ring replaces. Most families keep the group chat and let GranWatch answer the visit question." },
  { q: "Does it work if my parent is in a care home or retirement village?",
    a: "Yes — it's one of the most common setups. Staff provide care; the ring shows whether family is showing up. Those are very different things, and care homes will tell you the second one matters enormously." },
  { q: "I live overseas — what's the point if I can't visit?",
    a: "Distance is where the ring shines. You see in real time when family back home visit, instead of wondering at 2am. Many distant relatives take the Gran+ subscription for the whole family — it's the closest thing to being there, and it covers everyone. And GranWatch isn't only for scattered families: households in the same town use it just as much, because knowing and assuming are different things." },
  { q: "What happens when the ring goes red? Does it shame whoever hasn't been?",
    a: "The ring never names anyone. It only shows how long it's been since anyone visited. Families tell us it works precisely because nobody is accused — there's just a quiet, shared fact, and someone always responds to it." },
  { q: "How is GranWatch different from Snug Safety or medical alert apps?",
    a: "Check-in apps like Snug ask the elderly person to confirm they're okay each day, and alert services respond to emergencies. GranWatch solves a different problem: family presence. It doesn't monitor Gran at all — it shows whether her family is visiting, and gently gets everyone to show up more. Many families use both kinds of tool together." },
];

// ─── Route registration ───────────────────────────────────────────────────────

export function registerContentRoutes(app: Express) {
  // Guides index
  app.get("/guides", (_req, res) => {
    const items = Object.entries(ARTICLES)
      .map(([slug, a]) => `<li style="margin-bottom:18px"><a href="/guides/${slug}" style="font-size:19px;font-weight:600">${a.title}</a><br><span style="color:var(--muted);font-size:15px">${a.description}</span></li>`)
      .join("");
    res.send(layout({
      title: "Guides — long-distance elder care, without the guilt | GranWatch",
      description: "Honest, practical guides on visiting elderly parents, coordinating siblings, and fighting elder loneliness — from the family behind GranWatch.",
      path: "/guides",
      bodyHtml: `<h1>Guides</h1><p class="sub">Honest answers to the questions families actually ask at 11pm.</p><ul style="list-style:none;padding:0">${items}</ul>${CTA}`,
    }));
  });

  // Individual articles with Article schema
  app.get("/guides/:slug", (req, res, next) => {
    const article = ARTICLES[req.params.slug];
    if (!article) return next();
    res.send(layout({
      title: `${article.title} | GranWatch`,
      description: article.description,
      path: `/guides/${req.params.slug}`,
      bodyHtml: article.bodyHtml,
      schema: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: article.datePublished,
        author: { "@type": "Organization", name: "GranWatch", url: APP_URL },
        publisher: { "@type": "Organization", name: "GranWatch", url: APP_URL },
        mainEntityOfPage: `${APP_URL}/guides/${req.params.slug}`,
      },
    }));
  });

  // FAQ with FAQPage schema (what AI assistants cite)
  app.get("/faq", (_req, res) => {
    const body = FAQS.map(f => `<div class="qa"><h2>${f.q}</h2><p>${f.a}</p></div>`).join("");
    res.send(layout({
      title: "GranWatch FAQ — the elderly parent check-in app where Gran needs no phone",
      description: "Everything families ask about GranWatch: the status ring, pricing, privacy, care homes, overseas family members, and how it compares to check-in apps.",
      path: "/faq",
      bodyHtml: `<h1>Frequently asked questions</h1><p class="sub">Everything families ask before their first green ring.</p>${body}${CTA}`,
      schema: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map(f => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    }));
  });

  // Comparison page — AI assistants favour explicit comparisons for "which app" queries
  app.get("/compare/family-group-chat", (_req, res) => {
    res.send(layout({
      title: "GranWatch vs the family WhatsApp group — which actually gets Gran visited?",
      description: "The family group chat is where visit plans go to die. An honest comparison of coordinating elder care by group chat versus a shared visit ring.",
      path: "/compare/family-group-chat",
      bodyHtml: `
<h1>GranWatch vs the family group chat</h1>
<p class="sub">Every family already runs elder care through a group chat. Here's an honest look at what it does well — and the one job it can't do.</p>
<table>
<tr><th></th><th>Family group chat</th><th>GranWatch</th></tr>
<tr><td>Sharing news &amp; photos</td><td>Excellent — keep it</td><td>Not the point</td></tr>
<tr><td>Knowing when Gran was <em>last physically visited</em></td><td>Scroll and guess</td><td><span class="ring g"></span>One glance at the ring</td></tr>
<tr><td>Noticing when <em>nobody</em> has been for weeks</td><td>Silence looks the same as coverage</td><td><span class="ring r"></span>Ring turns red — everyone sees it</td></tr>
<tr><td>"I thought YOU went last week"</td><td>Monthly fight</td><td>The ring answers before anyone asks</td></tr>
<tr><td>What Gran has to do</td><td>Nothing</td><td>Nothing — no phone, no app</td></tr>
<tr><td>Care routines, meds, appointments</td><td>Buried in messages</td><td>Gran+ keeps them where everyone looks</td></tr>
<tr><td>Cost</td><td>Free</td><td>Free (ring, visits, alerts) · Gran+ optional, one sub covers the family</td></tr>
</table>
<p>The honest conclusion: keep the group chat — it's where the family lives. Add GranWatch for the one question the chat structurally cannot answer: <strong>is anyone actually showing up?</strong> Silence in a group chat is invisible. A red ring isn't.</p>
${CTA}`,
    }));
  });

  // Dynamic sitemap (shadows the static file; includes content pages)
  app.get("/sitemap.xml", (_req, res) => {
    const urls = [
      "/", "/privacy", "/terms", "/guides", "/faq", "/compare/family-group-chat",
      ...Object.keys(ARTICLES).map(s => `/guides/${s}`),
    ];
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(u => `  <url><loc>${APP_URL}${u}</loc></url>`).join("\n") +
      `\n</urlset>`
    );
  });

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${APP_URL}/sitemap.xml\n`);
  });
}
