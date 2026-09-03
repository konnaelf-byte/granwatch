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
//   node scripts/set-referral-code.mjs --doctor                    check the referral tables + migration state
//   node scripts/set-referral-code.mjs --fix-tables                create the referral tables if missing
//   node scripts/set-referral-code.mjs --fix-indexes               add the 0007 indexes if missing
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

// Health check. Found 2026-09-02: migration 0008_referrals never ran in production —
// its journal `when` (2025-06-06) predates 0005's (2026-04-23), so drizzle's migrator
// (which only applies entries newer than the last applied one) skipped it forever.
// Same for 0006/0007. `--fix-tables` creates the referral tables idempotently.
async function doctor() {
  const t = await rows(sql`SHOW TABLES LIKE 'referral%'`);
  console.log("referral tables present:", t.length ? t.map((x) => Object.values(x)[0]).join(", ") : "NONE (run --fix-tables)");
  const b = await rows(sql`SHOW COLUMNS FROM elders LIKE 'birthday'`);
  console.log("elders.birthday column (0006):", b.length ? "present" : "MISSING");
  const i = await rows(sql`SHOW INDEX FROM visits WHERE Key_name = 'visits_elderId_idx'`);
  console.log("visits_elderId_idx index (0007):", i.length ? "present" : "MISSING");
  try {
    const m = await rows(sql`SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id`);
    console.log(`applied drizzle migrations: ${m.length}`);
    for (const x of m) console.log(`  #${x.id}  ${new Date(Number(x.created_at)).toISOString()}  ${String(x.hash).slice(0, 12)}`);
  } catch (e) {
    console.log("no __drizzle_migrations table:", e.cause?.message ?? e.message);
  }
}

async function fixTables() {
  // Mirrors drizzle/0008_referrals.sql, made idempotent.
  console.log(`${dryRun ? "[dry-run] would create" : "Creating"} referrals + referralSignups (IF NOT EXISTS)`);
  if (dryRun) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS referrals (
    id int AUTO_INCREMENT PRIMARY KEY NOT NULL,
    userId int NOT NULL,
    code varchar(16) NOT NULL,
    signupCount int DEFAULT 0 NOT NULL,
    convertedCount int DEFAULT 0 NOT NULL,
    createdAt timestamp DEFAULT (now()) NOT NULL,
    CONSTRAINT referrals_userId_unique UNIQUE(userId),
    CONSTRAINT referrals_code_unique UNIQUE(code)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS referralSignups (
    id int AUTO_INCREMENT PRIMARY KEY NOT NULL,
    referralCode varchar(16) NOT NULL,
    newUserId int NOT NULL,
    converted boolean DEFAULT false NOT NULL,
    rewardAppliedAt timestamp NULL,
    createdAt timestamp DEFAULT (now()) NOT NULL,
    INDEX referralSignups_code_idx (referralCode),
    INDEX referralSignups_newUserId_idx (newUserId)
  )`);
  console.log("done.");
}

async function fixIndexes() {
  // Mirrors drizzle/0007_indexes.sql (also skipped by the journal bug); additive, tables are small.
  const wanted = [
    ["elderMembers", "elderMembers_elderId_idx", "elderId"],
    ["elderMembers", "elderMembers_userId_idx", "userId"],
    ["visits", "visits_elderId_idx", "elderId"],
    ["visits", "visits_userId_idx", "userId"],
    ["plannedVisits", "plannedVisits_elderId_idx", "elderId"],
    ["subscriptionContributions", "subscriptionContributions_elderId_idx", "elderId"],
    ["notifications", "notifications_userId_idx", "userId"],
    ["notifications", "notifications_elderId_idx", "elderId"],
  ];
  for (const [table, name, col] of wanted) {
    const have = await rows(sql`SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND INDEX_NAME = ${name} LIMIT 1`);
    if (have.length) { console.log(`  ${name}: present`); continue; }
    console.log(`  ${name}: ${dryRun ? "[dry-run] would create" : "creating"}`);
    if (!dryRun) await db.execute(sql.raw(`CREATE INDEX \`${name}\` ON \`${table}\` (\`${col}\`)`));
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
  if (flag("doctor")) await doctor();
  else if (flag("fix-tables")) await fixTables();
  else if (flag("fix-indexes")) await fixIndexes();
  else if (flag("list")) await list();
  else if (opt("find")) await find(opt("find"));
  else if (opt("code")) await setCode({ code: opt("code"), email: opt("email"), holder: opt("holder") });
  else {
    console.log("Usage: --doctor | --fix-tables | --fix-indexes | --list | --find <text> | --code <CODE> (--email <email> | --holder <name>) [--dry-run]");
  }
  process.exit(0);
} catch (e) {
  console.error("Error:", e.cause?.message ?? e.message);
  process.exit(1);
}
