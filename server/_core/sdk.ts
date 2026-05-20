import { createClerkClient, getAuth } from "@clerk/express";
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export const clerkClient = createClerkClient({ secretKey: ENV.clerkSecretKey });

/**
 * Resolve the authenticated user from a Clerk-signed request.
 *
 * Flow:
 *  1. Read Clerk userId from request (set by clerkMiddleware earlier in the chain).
 *  2. Look the user up in our DB by openId (openId == Clerk userId for new users).
 *  3. If not found, check whether this is a migrating Manus user (match by email).
 *  4. If still not found, create a brand-new DB record for the user.
 *  5. Touch lastSignedIn and return the full DB row.
 */
export async function authenticateRequest(req: Request): Promise<User> {
  const auth = getAuth(req);

  if (!auth?.userId) {
    throw ForbiddenError("Unauthenticated");
  }

  const clerkUserId = auth.userId;
  const now = new Date();

  // Fast path: user already in DB.
  let user = await db.getUserByOpenId(clerkUserId);

  if (!user) {
    // Fetch profile from Clerk to get name / email for upsert & migration.
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      null;
    const loginMethod =
      clerkUser.externalAccounts[0]?.provider ??
      (email ? "email" : null);

    // Migration: if a Manus user already exists with this email, update their openId.
    if (email) {
      const existingByEmail = await db.getUserByEmail(email);
      if (existingByEmail && existingByEmail.openId !== clerkUserId) {
        await db.migrateUserToClerk(existingByEmail.id, clerkUserId);
        user = await db.getUserByOpenId(clerkUserId);
      }
    }

    // Brand-new user: create a record.
    if (!user) {
      await db.upsertUser({
        openId: clerkUserId,
        name,
        email,
        loginMethod,
        lastSignedIn: now,
      });
      user = await db.getUserByOpenId(clerkUserId);
    }
  }

  if (!user) {
    throw ForbiddenError("User not found after sync");
  }

  // Update last sign-in timestamp.
  await db.upsertUser({ openId: user.openId, lastSignedIn: now });

  return user;
}
