/**
 * Firebase Cloud Messaging (FCM v1) push notification sender.
 *
 * Covers both iOS (via APNs bridge) and Android.
 *
 * Setup required:
 * 1. Create a Firebase project at console.firebase.google.com
 * 2. Add iOS app with bundle ID app.granwatch
 * 3. Add Android app with package name app.granwatch
 * 4. Upload your APNs Auth Key (.p8) under Project Settings → Cloud Messaging
 * 5. Go to Project Settings → Service Accounts → Generate new private key
 * 6. Set the downloaded JSON as FIREBASE_SERVICE_ACCOUNT_JSON env var (Railway)
 *
 * The Capacitor client side (@capacitor/push-notifications) registers tokens
 * and calls trpc.pushToken.register() — see pushRouter.ts.
 */

import { ENV } from "./_core/env";

// Lazily-initialised Firebase Admin app
let firebaseApp: import("firebase-admin/app").App | null = null;
let messagingInstance: import("firebase-admin/messaging").Messaging | null = null;

async function getMessaging() {
  if (messagingInstance) return messagingInstance;

  if (!ENV.firebaseServiceAccount) {
    console.warn("[Push] FIREBASE_SERVICE_ACCOUNT_JSON not set — native push disabled");
    return null;
  }

  const { initializeApp, getApp, cert } = await import("firebase-admin/app");
  const { getMessaging } = await import("firebase-admin/messaging");

  try {
    // Reuse existing app if hot-reloaded
    try {
      firebaseApp = getApp("granwatch");
    } catch {
      const serviceAccount = JSON.parse(ENV.firebaseServiceAccount);
      firebaseApp = initializeApp({ credential: cert(serviceAccount) }, "granwatch");
    }
    messagingInstance = getMessaging(firebaseApp);
    return messagingInstance;
  } catch (err) {
    console.error("[Push] Failed to initialise Firebase Admin:", err);
    return null;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  /** Deep-link path, e.g. "/elder/42" */
  data?: Record<string, string>;
}

/**
 * Send a push notification to one or more FCM tokens.
 * Returns the number of successfully delivered messages.
 * Invalid/expired tokens are silently ignored (caller should clean them up).
 */
export async function sendPush(tokens: string[], payload: PushPayload): Promise<number> {
  if (tokens.length === 0) return 0;

  const messaging = await getMessaging();
  if (!messaging) return 0;

  // FCM sendEachForMulticast caps at 500 tokens per call
  const CHUNK = 500;
  let successCount = 0;

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "granwatch_alerts",
          },
        },
      });

      successCount += response.successCount;

      // Log failures for debugging (token expiry is normal)
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error?.code ?? "unknown";
          // These codes mean the token is permanently invalid — caller should delete it
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            console.log(`[Push] Stale token removed: ${chunk[idx].slice(0, 20)}…`);
          } else {
            console.warn(`[Push] Delivery failed for token ${idx}: ${code}`);
          }
        }
      });
    } catch (err) {
      console.error(`[Push] sendEachForMulticast error (chunk ${i / CHUNK}):`, err);
    }
  }

  return successCount;
}
