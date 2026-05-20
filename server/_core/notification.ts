// Owner notifications via Resend email.
// Replaces the old Manus Forge push-notification service.

import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  }

  const title = input.title.trim();
  const content = input.content.trim();

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Title must be ≤ ${TITLE_MAX_LENGTH} chars.` });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Content must be ≤ ${CONTENT_MAX_LENGTH} chars.` });
  }

  return { title, content };
};

/**
 * Send an owner-alert email via Resend.
 * Returns true if sent, false if Resend is not configured (non-fatal).
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.resendApiKey) {
    console.warn("[Notification] RESEND_API_KEY not set — skipping owner notification");
    return false;
  }

  try {
    const resend = new Resend(ENV.resendApiKey);
    const { error } = await resend.emails.send({
      from: ENV.resendFromEmail,
      to: ENV.resendFromEmail, // owner's verified sending address doubles as inbox
      subject: `[GranWatch] ${title}`,
      text: content,
    });

    if (error) {
      console.warn("[Notification] Resend error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Failed to send owner email:", error);
    return false;
  }
}
