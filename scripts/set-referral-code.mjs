// Ambassador / regional-partner referral codes — vanity codes on the referral system.
//
// The app's referral system (server/referralRouter.ts) gives every user an auto code
// like KONNA427 and tracks sign-ups + Gran+ conversions per code. Ambassadors and
// regional partners get a memorable vanity code (SELAH, DOUG, ...) on the SAME tables,
// so their sign-ups show up with `--list` and, if the code sits on their own account,
// in their Account page's referral card.
//
// Share link format: https://granwatch.app/?ref=CODE   (the landing page captures ?ref=;
// /join is the family-invite page and does NOT capture it).
//
// Run from the project root — reads DATABASE_URL from .env exactly like server/db.ts.
//
//   node scripts/set-referral-code.mjs --list                      show every code + owner + counts
//   node scripts/set-referral-code.mjs --find jean                 search users by name/email
//   node scripts/set-referral-code.mjs --code SELAH --holder "Selah (Jeanne) — Ambassador"
//                                                                  create the code on a placeholder
//                                                                  holder account (no sign-up needed)
//   node scripts/set-referral-code.mjs --code SELAH --email jeanne@example.com
//                                                                  put the code on a real account
//                                                                  (moves it off the holder if one exists)
//   add --dry-run to any write command to preview without touching the database.
//
// Codes: letters/digits, 3–16 chars, stored uppercase (the client uppercases ?ref= too).

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — run from the project root so .env is picked up.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
const dryRun = flag("dry-run");
const LINK = (code) => `https://granwatch.app/?ref=${code}`;

async function rows(q) {
  const [r] = await db.execute(q);
  return r;
}

async function list() {
  const r = await rows(sql`
    SELECT r.code, r.signupCount, r.convertedCount, r.createdAt,
           u.id AS userId, u.name, u.email, u.loginMethod
    FROM referrals r LEFT JOIN users u ON u.id = r.userId
    ORDER BY r.createdAt`);
  if (!r.length) return console.log("No referral codes yet.");
  console.log(`${r.length} code(s):`);
  for (const x of r) {
    const owner = x.loginMethod === "ambassador" ? `${x.name} [holder account]` : `${x.name ?? "?"} <${x.email ?? "no email"}>`;
    console.log(`  ${x.code.padEnd(12)} sign-ups ${String(x.signupCount).padStart(3)}  converted ${String(x.convertedCount).padStart(3)}  → ${owner}  (userId ${x.userId})`);
  }
}

async function find(q) {
  const like = `%${q.toLowerCase()}%`;
  const r = await rows(sql`
    SELECT id, name, email, loginMethod, createdAt FROM users
    WHERE LOWER(COALESCE(name,'')) LIKE ${like} OR LOWER(COALESCE(email,'')) LIKE ${like}
    ORDER BY id LIMIT 20`);
  if (!r.length) return console.log(`No users matching "${q}".`);
  for (const u of r) console.log(`  userId ${u.id}: ${u.name ?? "?"} <${u.email ?? "no email"}> via ${u.loginMethod ?? "?"} (joined ${new Date(u.createdAt).toISOString().slice(0, 10)})`);
}

async function setCode({ code, email, holder }) {
  code = code.toUpperCase();
  if (!/^[A-Z0-9]{3,16}$/.test(code)) throw new Error(`Code must be 3–16 letters/digits, got "${code}".`);

  // Who will own the code?
  let owner;
  if (email) {
    const r = await rows(sql`SELECT id, name, email FROM users WHERE LOWER(email) = ${email.toLowerCase()} LIMIT 1`);
    if (!r.length) throw new Error(`No GranWatch account with email ${email}. Ask them to sign up first, or use --holder to create the code without an account.`);
    owner = { id: r[0].id, label: `${r[0].name ?? "?"} <${r[0].email}>` };
  } else if (holder) {
    const openId = `ambassador:${code.toLowerCase()}`;
    const r = await rows(sql`SELECT id, name FROM users WHERE openId = ${openId} LIMIT 1`);
    if (r.length) {
      owner = { id: r[0].id, label: `${r[0].name} [holder account]` };
    } else {
      console.log(`${dryRun ? "[dry-run] would create" : "Creating"} holder account "${holder}" (openId ${openId})`);
      if (!dryRun) {
        const [res] = await db.execute(sql`INSERT INTO users (openId, name, loginMethod, role) VALUES (${openId}, ${holder}, 'ambassador', 'user')`);
        owner = { id: res.insertId, label: `${holder} [holder account]` };
      } else {
        owner = { id: -1, label: `${holder} [holder account, not yet created]` };
      }
    }
  } else {
    throw new Error("Give --email <account email> or --holder <display name> to say who owns the code.");
  }

  // Is the code already taken?
  const taken = await rows(sql`SELECT id, userId FROM referrals WHERE code = ${code} LIMIT 1`);
  if (taken.length && taken[0].userId !== owner.id) {
    const holderRow = await rows(sql`SELECT id, loginMethod FROM users WHERE id = ${taken[0].userId} LIMIT 1`);
    const isHolder = holderRow[0]?.loginMethod === "ambassador";
    if (!(email && isHolder)) throw new Error(`Code ${code} already belongs to userId ${taken[0].userId}. Pick another code.`);
    // Moving a holder-held code onto a real account: re-point the row, drop the holder user.
    console.log(`${dryRun ? "[dry-run] would move" : "Moving"} ${code} from holder userId ${taken[0].userId} → ${owner.label} (userId ${owner.id})`);
    if (!dryRun) {
      const mine = await rows(sql`SELECT id, code FROM referrals WHERE userId = ${owner.id} LIMIT 1`);
      if (mine.length) {
        // The real account already has an auto code — retire it, keep its attributions under the vanity code.
        await db.execute(sql`UPDATE referralSignups SET referralCode = ${code} WHERE referralCode = ${mine[0].code}`);
        await db.execute(sql`DELETE FROM referrals WHERE id = ${mine[0].id}`);
        console.log(`  retired their auto code ${mine[0].code} (its sign-ups now count under ${code})`);
      }
      await db.execute(sql`UPDATE referrals SET userId = ${owner.id} WHERE id = ${taken[0].id}`);
      await db.execute(sql`DELETE FROM users WHERE id = ${taken[0].userId}`);
    }
    return done(code, owner);
  }

  // Does the owner already have a code?
  const existing = owner.id > 0 ? await rows(sql`SELECT id, code FROM referrals WHERE userId = ${owner.id} LIMIT 1`) : [];
  if (existing.length) {
    if (existing[0].code === code) {
      console.log(`${code} is already ${owner.label}'s code — nothing to do.`);
      return done(code, owner);
    }
    console.log(`${dryRun ? "[dry-run] would rename" : "Renaming"} ${owner.label}'s code ${existing[0].code} → ${code} (keeping its sign-ups)`);
    if (!dryRun) {
      await db.execute(sql`UPDATE referrals SET code = ${code} WHERE id = ${existing[0].id}`);
      await db.execute(sql`UPDATE referralSignups SET referralCode = ${code} WHERE referralCode = ${existing[0].code}`);
    }
    return done(code, owner);
  }

  console.log(`${dryRun ? "[dry-run] would create" : "Creating"} code ${code} for ${owner.label}`);
  if (!dryRun) await db.execute(sql`INSERT INTO referrals (userId, code) VALUES (${owner.id}, ${code})`);
  return done(code, owner);
}

function done(code, owner) {
  console.log("");
  console.log(`  Code:  ${code}`);
  console.log(`  Owner: ${owner.label}`);
  console.log(`  Link:  ${LINK(code)}`);
  if (dryRun) console.log("  (dry-run — nothing was written)");
}

try {
  if (flag("list")) await list();
  else if (opt("find")) await find(opt("find"));
  else if (opt("code")) await setCode({ code: opt("code"), email: opt("email"), holder: opt("holder") });
  else {
    console.log("Usage: --list | --find <text> | --code <CODE> (--email <email> | --holder <name>) [--dry-run]");
  }
  process.exit(0);
} catch (e) {
  console.error("Error:", e.message);
  process.exit(1);
}
