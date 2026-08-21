// One-off (2026-08-21): family visit updates ("Barry just visited Gran Nanna")
// became ON by default (migration 0019). This flips EXISTING members who still
// have the old opt-in default of 0 — nobody had deliberately opted out; the
// toggle simply shipped as off. Per Konna: better that the few who mind switch
// it off than everyone missing the app's core signal.
// Uses drizzle exactly like server/db.ts does (plain mysql2 connect timed out
// against this DATABASE_URL; drizzle's URL handling works — same as drizzle-kit).
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);
const before = await db.execute(
  sql`SELECT socialNotificationsEnabled AS v, COUNT(*) AS c FROM elderMembers GROUP BY socialNotificationsEnabled`
);
console.log("before:", JSON.stringify(before[0]));
const res = await db.execute(
  sql`UPDATE elderMembers SET socialNotificationsEnabled = 1 WHERE socialNotificationsEnabled = 0`
);
console.log("updated:", JSON.stringify(res[0]?.affectedRows ?? res));
const after = await db.execute(
  sql`SELECT socialNotificationsEnabled AS v, COUNT(*) AS c FROM elderMembers GROUP BY socialNotificationsEnabled`
);
console.log("after:", JSON.stringify(after[0]));
process.exit(0);
