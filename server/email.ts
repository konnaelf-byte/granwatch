/**
 * GranWatch Email Service
 *
 * Sends branded transactional emails via Resend.
 * Two notification triggers:
 *   - 14 days: email the family member(s) who visited furthest back
 *   - 21 days: email the entire family
 */

import { Resend } from "resend";
import { ENV } from "./_core/env";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(ENV.resendApiKey);
  }
  return resendClient;
}

// ─── HTML Email Template ──────────────────────────────────────────────────────

function buildEmailHtml({
  recipientName,
  granName,
  daysSince,
  isWholeFamily,
  granPhotoUrl,
}: {
  recipientName: string;
  granName: string;
  daysSince: number;
  isWholeFamily: boolean;
  granPhotoUrl?: string | null;
}): string {
  const greeting = isWholeFamily
    ? `Hi ${recipientName},`
    : `Hi ${recipientName},`;

  const urgencyColor = daysSince >= 21 ? "#dc2626" : "#d97706";
  const urgencyLabel = daysSince >= 21 ? "Overdue" : "Overdue";

  const message = isWholeFamily
    ? `It's been <strong>${daysSince} days</strong> since anyone in the family visited <strong>${granName}</strong>. She'd love to see a familiar face — can you find a moment to pop in or give her a call?`
    : `It's been a while since your last visit to <strong>${granName}</strong> — the family hasn't had a visitor in <strong>${daysSince} days</strong>. You're one of the family members who visited furthest back. Could you be the one to brighten her day?`;

  const photoSection = granPhotoUrl
    ? `<img src="${granPhotoUrl}" alt="${granName}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid ${urgencyColor};display:block;margin:0 auto 16px;" />`
    : `<div style="width:80px;height:80px;border-radius:50%;background:#f97316;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;line-height:80px;text-align:center;">👵</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GranWatch — Visit Reminder</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#f97316;padding:24px 32px;text-align:center;">
              <span style="font-size:28px;">🌿</span>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">GranWatch</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Keeping family connected</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <!-- Gran photo / avatar -->
              <div style="text-align:center;margin-bottom:8px;">
                ${photoSection}
                <span style="display:inline-block;background:${urgencyColor};color:#fff;font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;letter-spacing:0.5px;text-transform:uppercase;">${urgencyLabel} · ${daysSince} days</span>
              </div>

              <h2 style="margin:20px 0 8px;font-size:20px;font-weight:700;color:#1c1917;text-align:center;">${granName} misses you 💛</h2>

              <p style="margin:0 0 16px;font-size:15px;color:#44403c;line-height:1.6;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#44403c;line-height:1.6;">${message}</p>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:24px;">
                <a href="https://granwatch.com/dashboard" style="display:inline-block;background:#f97316;color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:99px;text-decoration:none;">Open GranWatch</a>
              </div>

              <p style="margin:0;font-size:13px;color:#78716c;line-height:1.5;">You can log a visit, schedule a future visit, or send a video call note directly from the app. Every check-in counts. 💚</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f5f4;padding:16px 32px;text-align:center;border-top:1px solid #e7e5e4;">
              <p style="margin:0 0 4px;font-size:12px;color:#a8a29e;">You're receiving this because you're a family member on GranWatch.</p>
              <p style="margin:0;font-size:12px;color:#a8a29e;">
                <a href="https://granwatch.com/dashboard" style="color:#f97316;text-decoration:none;">Manage notification preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText({
  recipientName,
  granName,
  daysSince,
  isWholeFamily,
}: {
  recipientName: string;
  granName: string;
  daysSince: number;
  isWholeFamily: boolean;
}): string {
  const message = isWholeFamily
    ? `It's been ${daysSince} days since anyone in the family visited ${granName}. She'd love to see a familiar face — can you find a moment to pop in or give her a call?`
    : `It's been a while since your last visit to ${granName} — the family hasn't had a visitor in ${daysSince} days. You're one of the family members who visited furthest back. Could you be the one to brighten her day?`;

  return `GranWatch — ${granName} misses you 💛

Hi ${recipientName},

${message}

Open GranWatch to log a visit or schedule one: https://granwatch.com/dashboard

Every check-in counts. 💚

---
You're receiving this because you're a family member on GranWatch.
Manage notification preferences: https://granwatch.com/dashboard`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface EmailRecipient {
  name: string;
  email: string;
}

export interface SendVisitReminderParams {
  recipients: EmailRecipient[];
  granName: string;
  granPhotoUrl?: string | null;
  daysSince: number;
  /** true = 21-day whole-family email; false = 14-day longest-absent email */
  isWholeFamily: boolean;
}

/**
 * Send visit reminder emails to one or more family members.
 * Returns the number of emails successfully sent.
 */
export async function sendVisitReminderEmails(params: SendVisitReminderParams): Promise<number> {
  const { recipients, granName, granPhotoUrl, daysSince, isWholeFamily } = params;

  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email send");
    return 0;
  }

  const resend = getResend();
  let sent = 0;

  for (const recipient of recipients) {
    if (!recipient.email) continue;

    try {
      const subject = isWholeFamily
        ? `${granName} hasn't had a visitor in ${daysSince} days 💛`
        : `It's been a while since you visited ${granName} 💛`;

      const { error } = await resend.emails.send({
        from: `GranWatch <${ENV.resendFromEmail}>`,
        to: recipient.email,
        subject,
        html: buildEmailHtml({
          recipientName: recipient.name || "there",
          granName,
          daysSince,
          isWholeFamily,
          granPhotoUrl,
        }),
        text: buildEmailText({
          recipientName: recipient.name || "there",
          granName,
          daysSince,
          isWholeFamily,
        }),
      });

      if (error) {
        console.error(`[Email] Failed to send to ${recipient.email}:`, error);
      } else {
        console.log(`[Email] Sent visit reminder to ${recipient.email} for ${granName} (${daysSince} days)`);
        sent++;
      }
    } catch (err) {
      console.error(`[Email] Unexpected error sending to ${recipient.email}:`, err);
    }
  }

  return sent;
}

/**
 * Validate that the Resend API key is working.
 * The key is send-only so we can't list domains — instead we check the error type.
 * A 403 "domain not verified" error means the key IS valid but the domain needs DNS setup.
 * A 401 "unauthorized" error means the key is invalid.
 */
export async function validateResendCredentials(): Promise<boolean> {
  if (!ENV.resendApiKey) return false;
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: `GranWatch <${ENV.resendFromEmail}>`,
      to: "test@example.com",
      subject: "Credential check",
      text: "Credential validation",
    });
    // 403 domain_not_verified = key is valid, domain just needs DNS setup
    // No error = key is valid and domain is verified
    if (!result.error) return true;
    if (result.error.name === "validation_error") return true; // domain not verified yet, but key works
    return false;
  } catch {
    return false;
  }
}
