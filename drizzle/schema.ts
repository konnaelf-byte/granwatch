import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Elder profiles — the grandmothers/grandfathers being watched.
 */
export const elders = mysqlTable("elders", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  photoUrl: text("photoUrl"),
  alertThresholdDays: int("alertThresholdDays").default(21).notNull(), // days before red alert
  wellbeingEnabled: boolean("wellbeingEnabled").default(false).notNull(),
  careNotes: text("careNotes"),
  // invite code for family members to join
  inviteCode: varchar("inviteCode", { length: 16 }).notNull().unique(),
  // subscription (Lemon Squeezy)
  isPaid: boolean("isPaid").default(false).notNull(),
  // Free-trial end. Set to created+TRIAL_DAYS on profile creation (see
  // server/entitlement.ts). Entitlement = isPaid OR trialEndsAt in the future.
  // Trial expiry LOCKS Gran+ features, it never deletes data. NULL = no trial
  // (should not occur for elders created after 2026-07-31; backfilled for older).
  trialEndsAt: timestamp("trialEndsAt"),
  lemonsqueezySubscriptionId: varchar("lemonsqueezySubscriptionId", { length: 255 }),
  lemonsqueezyCustomerId: varchar("lemonsqueezyCustomerId", { length: 255 }),
  cancellationRequestedAt: timestamp("cancellationRequestedAt"),
  birthday: varchar("birthday", { length: 10 }), // "YYYY-MM-DD" (year stored; cron extracts MM-DD for annual reminders)
  // Location — used ONLY to resolve gift/flower delivery partners near Gran.
  // Deliberately no street address (data minimalism / POPIA-GDPR): the buyer
  // enters the delivery address at the partner's checkout.
  country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2, e.g. "ZA"
  city: varchar("city", { length: 128 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Elder = typeof elders.$inferSelect;
export type InsertElder = typeof elders.$inferInsert;

/**
 * Family members linked to an elder profile.
 */
export const elderMembers = mysqlTable("elderMembers", {
  id: int("id").autoincrement().primaryKey(),
  elderId: int("elderId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  // Notification preferences — user can opt out per elder profile
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
  // Social pushes ("Barry just visited Gran Nanna") — ON by default since
  // 2026-08-21 (Konna: most people never find the toggle; better to let the
  // few who mind switch it off than have everyone miss the app's core signal)
  socialNotificationsEnabled: boolean("socialNotificationsEnabled").default(true).notNull(),
}, (table) => ({
  elderIdIdx: index("elderMembers_elderId_idx").on(table.elderId),
  userIdIdx: index("elderMembers_userId_idx").on(table.userId),
}));

export type ElderMember = typeof elderMembers.$inferSelect;
export type InsertElderMember = typeof elderMembers.$inferInsert;

/**
 * Logged visits — past visits that reset the clock.
 */
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  elderId: int("elderId").notNull(),
  userId: int("userId").notNull(),
  visitedAt: timestamp("visitedAt").notNull(),
  notes: text("notes"),
  photoUrl: text("photoUrl"),
  wellbeingScore: int("wellbeingScore"), // 1-5, only if wellbeing enabled
  moodEmoji: varchar("moodEmoji", { length: 16 }), // mood attached to the visit — free for everyone
  moodNote: text("moodNote"), // optional note about the mood — Gran+ only (enforced server-side)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  elderIdIdx: index("visits_elderId_idx").on(table.elderId),
  userIdIdx: index("visits_userId_idx").on(table.userId),
}));

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

/**
 * Planned/booked future visits — slots claimed by family members.
 */
export const plannedVisits = mysqlTable("plannedVisits", {
  id: int("id").autoincrement().primaryKey(),
  elderId: int("elderId").notNull(),
  userId: int("userId").notNull(),
  plannedDate: timestamp("plannedDate").notNull(),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurringWeeks: int("recurringWeeks"), // recur every N weeks
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  elderIdIdx: index("plannedVisits_elderId_idx").on(table.elderId),
}));

export type PlannedVisit = typeof plannedVisits.$inferSelect;
export type InsertPlannedVisit = typeof plannedVisits.$inferInsert;

/**
 * Scheduled-visit reminder log — ensures each reminder phase fires exactly once
 * per planned visit occurrence (visitDay handles recurring visits whose
 * plannedDate advances). Phases: day_before (18:00 SAST), day_of (08:00 SAST),
 * log_prompt (2h after the visit time, or 19:00 SAST if day-only).
 */
export const plannedVisitReminders = mysqlTable("plannedVisitReminders", {
  id: int("id").autoincrement().primaryKey(),
  plannedVisitId: int("plannedVisitId").notNull(),
  phase: mysqlEnum("phase", ["day_before", "day_of", "log_prompt"]).notNull(),
  // SAST calendar day of the visit occurrence, "YYYY-MM-DD"
  visitDay: varchar("visitDay", { length: 10 }).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
}, (table) => ({
  uniquePhase: uniqueIndex("pvr_visit_phase_day_idx").on(table.plannedVisitId, table.phase, table.visitDay),
}));

export type PlannedVisitReminder = typeof plannedVisitReminders.$inferSelect;

/**
 * Subscription split contributions — family members who chip in for Gran+.
 */
export const subscriptionContributions = mysqlTable("subscriptionContributions", {
  id: int("id").autoincrement().primaryKey(),
  elderId: int("elderId").notNull(),
  userId: int("userId").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  elderIdIdx: index("subscriptionContributions_elderId_idx").on(table.elderId),
}));

export type SubscriptionContribution = typeof subscriptionContributions.$inferSelect;
export type InsertSubscriptionContribution = typeof subscriptionContributions.$inferInsert;

/**
 * Referral codes — each user gets one; tracks who invited whom.
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  // The user who owns this referral code
  userId: int("userId").notNull().unique(),
  // The shareable code (e.g. "KONNA42")
  code: varchar("code", { length: 16 }).notNull().unique(),
  // How many signups this code has generated
  signupCount: int("signupCount").default(0).notNull(),
  // How many of those signups converted to paid (triggering the reward)
  convertedCount: int("convertedCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Referral signups — tracks each new user who signed up via a referral code.
 */
export const referralSignups = mysqlTable("referralSignups", {
  id: int("id").autoincrement().primaryKey(),
  // The referral code used
  referralCode: varchar("referralCode", { length: 16 }).notNull(),
  // The user who signed up
  newUserId: int("newUserId").notNull(),
  // Whether this signup converted to a paid subscription (triggers referrer's reward)
  converted: boolean("converted").default(false).notNull(),
  // When the 1-month-free reward was applied to the referrer
  rewardAppliedAt: timestamp("rewardAppliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  referralCodeIdx: index("referralSignups_code_idx").on(table.referralCode),
  newUserIdIdx: index("referralSignups_newUserId_idx").on(table.newUserId),
}));

export type ReferralSignup = typeof referralSignups.$inferSelect;

/**
 * Notifications log — track what alerts have been sent.
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  elderId: int("elderId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["nudge", "red_alert", "weekly_digest"]).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
}, (table) => ({
  userIdIdx: index("notifications_userId_idx").on(table.userId),
  elderIdIdx: index("notifications_elderId_idx").on(table.elderId),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Push notification tokens — one row per device per user.
 * Tokens are registered by the Capacitor PushNotifications plugin on native app launch.
 * Used by the cron job to send native push alongside email/in-app nudges.
 */
export const pushTokens = mysqlTable("pushTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  platform: mysqlEnum("platform", ["ios", "android", "web"]).notNull().default("ios"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("pushTokens_userId_idx").on(table.userId),
}));

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

/**
 * Gran+ care schedule — medications tracked per elder.
 * Family members can mark meds as taken during or after a visit.
 */
export const elderMedications = mysqlTable("elderMedications", {
  id: int("id").autoincrement().primaryKey(),
  elderId: int("elderId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),         // e.g. "Blood pressure meds"
  dosage: varchar("dosage", { length: 100 }),                // e.g. "1 tablet"
  frequency: mysqlEnum("frequency", ["daily", "twice_daily", "weekly", "as_needed"]).notNull().default("daily"),
  timeOfDay: mysqlEnum("timeOfDay", ["am", "midday", "pm"]), // optional; shown when frequency is "daily"
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  elderIdIdx: index("elderMedications_elderId_idx").on(table.elderId),
}));

export type ElderMedication = typeof elderMedications.$inferSelect;
export type InsertElderMedication = typeof elderMedications.$inferInsert;

/**
 * Log each time a medication is marked taken or missed.
 */
export const medicationLogs = mysqlTable("medicationLogs", {
  id: int("id").autoincrement().primaryKey(),
  medicationId: int("medicationId").notNull(),
  elderId: int("elderId").notNull(),
  loggedByUserId: int("loggedByUserId").notNull(),
  takenAt: timestamp("takenAt").notNull(),
  status: mysqlEnum("status", ["taken", "missed"]).notNull().default("taken"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  medicationIdIdx: index("medicationLogs_medicationId_idx").on(table.medicationId),
  elderIdIdx: index("medicationLogs_elderId_idx").on(table.elderId),
}));

export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = typeof medicationLogs.$inferInsert;

/**
 * Gran+ care schedule — doctor / medical appointments.
 * Visible to all family members; admin marks completed.
 */
export const elderAppointments = mysqlTable("elderAppointments", {
  id: int("id").autoincrement().primaryKey(),
  elderId: int("elderId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),        // e.g. "GP check-up"
  doctorName: varchar("doctorName", { length: 255 }),
  location: varchar("location", { length: 255 }),
  scheduledAt: timestamp("scheduledAt").notNull(),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  elderIdIdx: index("elderAppointments_elderId_idx").on(table.elderId),
}));

export type ElderAppointment = typeof elderAppointments.$inferSelect;
export type InsertElderAppointment = typeof elderAppointments.$inferInsert;

/**
 * Gift logs — every "Send Flowers / Send a Gift" tap.
 * Free-tier feature (no Gran+ gate). Used for the activity timeline
 * and future affiliate/commission reporting once partner deals are signed.
 */
export const giftLogs = mysqlTable("giftLogs", {
  id: int("id").autoincrement().primaryKey(),
  elderId: int("elderId").notNull(),
  sentByUserId: int("sentByUserId").notNull(),
  /** "flowers" = Send Flowers button, "gift" = Send a Gift button */
  giftType: mysqlEnum("giftType", ["flowers", "gift"]).notNull(),
  /** Filled once we have named partner agreements (e.g. "Interflora AU") */
  partnerName: varchar("partnerName", { length: 255 }),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  elderIdIdx: index("giftLogs_elderId_idx").on(table.elderId),
  userIdIdx: index("giftLogs_sentByUserId_idx").on(table.sentByUserId),
}));

export type GiftLog = typeof giftLogs.$inferSelect;
export type InsertGiftLog = typeof giftLogs.$inferInsert;

/**
 * Gran+ custom counters — "text Gran weekly", "day trip 4×/year", etc.
 * Displayed as a horizontal drain bar on the elder profile (distinct from
 * the main status ring). scope "family" = visible to the whole family;
 * scope "private" = visible ONLY to ownerUserId (and its logs must never
 * appear in the family feed — Konstand's call 2026-08-10).
 */
export const elderCounters = mysqlTable("elderCounters", {
  id: int("id").autoincrement().primaryKey(),
  elderId: int("elderId").notNull(),
  name: varchar("name", { length: 30 }).notNull(),           // e.g. "Text Gran" (≤30 chars)
  /** Single emoji shown on the bar (and later in the iOS widget, native build 14) */
  emoji: varchar("emoji", { length: 16 }).notNull().default("💚"),
  /** Target interval in days: 7 = weekly, 91 = quarterly, 1–365 allowed */
  intervalDays: int("intervalDays").notNull(),
  /** Calendar-anchored counters (user ask 2026-08-22: "pay the pharmacy bill
   *  on the 7th"): when set (1–31), the counter is due on this day of every
   *  month (clamped to the month's last day) instead of every intervalDays. */
  monthlyDay: int("monthlyDay"),
  scope: mysqlEnum("scope", ["private", "family"]).notNull().default("family"),
  /** For scope "private": the only user who sees/logs this counter */
  ownerUserId: int("ownerUserId"),
  createdByUserId: int("createdByUserId").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  /** Set by nightly cron when the overdue push fires; cleared conceptually
   *  by comparing against the latest log — ensures once-per-crossing pushes. */
  lastNotifiedAt: timestamp("lastNotifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  elderIdIdx: index("elderCounters_elderId_idx").on(table.elderId),
}));

export type ElderCounter = typeof elderCounters.$inferSelect;
export type InsertElderCounter = typeof elderCounters.$inferInsert;

/**
 * Log each time a counter is "done" (family member taps Log it 💚).
 * NOT mirrored into the visits feed — counters have their own history.
 */
export const counterLogs = mysqlTable("counterLogs", {
  id: int("id").autoincrement().primaryKey(),
  counterId: int("counterId").notNull(),
  elderId: int("elderId").notNull(),
  loggedByUserId: int("loggedByUserId").notNull(),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  counterIdIdx: index("counterLogs_counterId_idx").on(table.counterId),
  elderIdIdx: index("counterLogs_elderId_idx").on(table.elderId),
}));

export type CounterLog = typeof counterLogs.$inferSelect;
export type InsertCounterLog = typeof counterLogs.$inferInsert;
