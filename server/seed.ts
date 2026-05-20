/**
 * Demo data seed — run via: npx tsx server/seed.ts
 * Creates a demo elder "Dorothy" with visit history for testing.
 * Only runs if DATABASE_URL is set.
 */
import { drizzle } from "drizzle-orm/mysql2";
import { elders, elderMembers, visits, plannedVisits, notifications, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config();

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL — skipping seed");
    return;
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log("Seeding demo data...");

  // Check if demo elder already exists
  const existing = await db.select().from(elders).where(eq(elders.inviteCode, "DEMO1234")).limit(1);
  if (existing.length > 0) {
    console.log("Demo data already seeded. Skipping.");
    return;
  }

  // Get first user to assign as creator
  const [firstUser] = await db.select().from(users).limit(1);
  if (!firstUser) {
    console.log("No users found — sign in first, then run seed.");
    return;
  }

  // Create demo elder
  const [elderResult] = await db.insert(elders).values({
    name: "Dorothy",
    photoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663467284809/kPXP5TfTQ4hUuXDHU4e2Bo/gran_demo_24d7b2df.jpeg",
    alertThresholdDays: 21,
    wellbeingEnabled: true,
    inviteCode: "DEMO1234",
    createdByUserId: firstUser.id,
    isPaid: false,
  });

  const elderId = (elderResult as any).insertId as number;

  // Add creator as admin member
  await db.insert(elderMembers).values({
    elderId,
    userId: firstUser.id,
    role: "admin",
  });

  // Add some past visits
  const visitDates = [
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
    new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
  ];

  for (const date of visitDates) {
    await db.insert(visits).values({
      elderId,
      userId: firstUser.id,
      visitedAt: date,
      notes: "Had tea and biscuits. Gran was in great spirits!",
      wellbeingScore: 4,
    });
  }

  // Add a planned visit
  await db.insert(plannedVisits).values({
    elderId,
    userId: firstUser.id,
    plannedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    notes: "Bringing flowers",
  });

  // Add a nudge notification
  await db.insert(notifications).values({
    elderId,
    userId: firstUser.id,
    type: "nudge",
    read: false,
  });

  console.log(`✅ Demo elder "Dorothy" created with ID ${elderId}`);
  console.log(`   Invite code: DEMO1234`);
  console.log(`   ${visitDates.length} past visits added`);
  console.log(`   1 planned visit added`);
}

seed().catch(console.error).finally(() => process.exit(0));
